import { afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { pool } from '../src/db.js'

// Runs against the seeded database: inquiry #4 is assigned to Nimali, not Amal.
async function loginCookie(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' })
  expect(res.status).toBe(200)
  return res.headers['set-cookie']
}

describe('inquiry access rule', () => {
  afterAll(async () => {
    await pool.query(`DELETE FROM inquiries WHERE subject = 'TEST claim race'`)
    await pool.end()
  })

  it('lets only the first of two staff claim an unassigned inquiry', async () => {
    const manager = (await pool.query(`SELECT id FROM users WHERE email = 'manager@coffeeninja.test'`)).rows[0]
    const { rows } = await pool.query(
      `INSERT INTO inquiries (customer_name, contact, subject, description, created_by, updated_by)
       VALUES ('Test', 'claim@test.local', 'TEST claim race', 'Used by the access test.', $1, $1) RETURNING id`,
      [manager.id],
    )
    const id = rows[0].id

    const amal = await loginCookie('amal@coffeeninja.test')
    const nimali = await loginCookie('nimali@coffeeninja.test')

    const first = await request(app).post(`/api/inquiries/${id}/claim`).set('Cookie', amal)
    expect(first.status).toBe(200)
    expect(first.body.inquiry.assignedTo.name).toBe('Amal Silva')

    const second = await request(app).post(`/api/inquiries/${id}/claim`).set('Cookie', nimali)
    expect(second.status).toBe(409)
    expect(second.body.error.details.reason).toBe('CLAIMED')

    // Once claimed it is no longer visible to the other staff member
    const view = await request(app).get(`/api/inquiries/${id}`).set('Cookie', nimali)
    expect(view.status).toBe(403)
  })

  it('rejects requests without a session', async () => {
    const res = await request(app).get('/api/inquiries/4')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('blocks staff from opening an inquiry assigned to someone else', async () => {
    const cookie = await loginCookie('amal@coffeeninja.test')
    const res = await request(app).get('/api/inquiries/4').set('Cookie', cookie)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('lets a manager open any inquiry', async () => {
    const cookie = await loginCookie('manager@coffeeninja.test')
    const res = await request(app).get('/api/inquiries/4').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.inquiry.id).toBe(4)
  })

  // Picks any In Progress inquiry so the test survives status changes made in the UI
  it('blocks reassigning an inquiry that is already in progress', async () => {
    const cookie = await loginCookie('manager@coffeeninja.test')
    const list = await request(app).get('/api/inquiries?status=In Progress').set('Cookie', cookie)
    const inquiry = list.body.inquiries[0]
    expect(inquiry).toBeDefined()

    const users = await request(app).get('/api/users').set('Cookie', cookie)
    const other = users.body.users.find((u: { id: number }) => u.id !== inquiry.assignedTo.id)

    const res = await request(app).patch(`/api/inquiries/${inquiry.id}`).set('Cookie', cookie).send({ assignedTo: other.id })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
    expect(res.body.error.details.reason).toBe('IN_PROGRESS')
  })
})
