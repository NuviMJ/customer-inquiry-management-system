import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NewInquiryPage } from './NewInquiryPage'

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NewInquiryPage />
    </MemoryRouter>,
  )
}

function fakeResponse(status: number, body: unknown) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)
}

describe('NewInquiryPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows field errors and sends nothing when the form is empty', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save inquiry' }))

    expect(screen.getByText('Customer name needs at least 2 characters')).toBeTruthy()
    expect(screen.getByText('Enter an email address or phone number')).toBeTruthy()
    expect(screen.getByText('Subject needs at least 3 characters')).toBeTruthy()
    expect(screen.getByText('Description needs at least 10 characters')).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows the duplicate message with a link when the API answers 409', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      fakeResponse(409, {
        error: {
          code: 'CONFLICT',
          message: 'An open inquiry with the same contact and subject already exists',
          details: { existingId: 1 },
        },
      }),
    )
    renderPage()

    fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Ruwan' } })
    fireEvent.change(screen.getByLabelText('Contact (email or phone)'), { target: { value: 'ruwan@example.com' } })
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Espresso machine not heating' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Submitted again by mistake.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save inquiry' }))

    expect(await screen.findByText(/already exists/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open inquiry #1' }).getAttribute('href')).toBe('/inquiries/1')
  })
})
