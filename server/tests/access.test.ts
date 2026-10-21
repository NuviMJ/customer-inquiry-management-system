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
  afterAll(() => pool.end())

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
})
