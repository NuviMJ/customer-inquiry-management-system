import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { PageHeader } from '../components/PageHeader'
import type { Priority } from '../types'

interface FormValues {
  customerName: string
  contact: string
  subject: string
  description: string
  priority: '' | Priority
}

const empty: FormValues = { customerName: '', contact: '', subject: '', description: '', priority: '' }

// Same rules as the server; this only gives faster feedback, the API still checks
function validate(v: FormValues) {
  const errors: Partial<Record<keyof FormValues, string>> = {}
  if (v.customerName.trim().length < 2) errors.customerName = 'Customer name needs at least 2 characters'
  if (!v.contact.trim()) errors.contact = 'Enter an email address or phone number'
  if (v.subject.trim().length < 3) errors.subject = 'Subject needs at least 3 characters'
  if (v.description.trim().length < 10) errors.description = 'Description needs at least 10 characters'
  return errors
}

export function NewInquiryPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>(empty)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [duplicateId, setDuplicateId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: undefined })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setDuplicateId(null)

    const errors = validate(values)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const data = await api.createInquiry({
        customerName: values.customerName,
        contact: values.contact,
        subject: values.subject,
        description: values.description,
        priority: values.priority || null,
      })
      // The detail page shows the "saved" notice
      navigate(`/inquiries/${data.inquiry.id}`, { state: { saved: true } })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.details?.fields) {
        setFieldErrors(err.details.fields)
      } else if (err instanceof ApiError && err.code === 'CONFLICT') {
        setDuplicateId(err.details?.existingId ?? null)
        setError(err.message)
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not save the inquiry')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function field(name: keyof FormValues, label: string, input: JSX.Element) {
    const message = fieldErrors[name]
    return (
      <label>
        {label}
        {input}
        {message && <span className="field-error" role="alert">{message}</span>}
      </label>
    )
  }

  return (
    <>
      <PageHeader title="New inquiry" crumb={{ label: 'Inquiries', to: '/inquiries' }} />
      <main className="page">
        <div>
          <h1>New inquiry</h1>
          <div className="sub">Record what the customer asked for so it can be tracked.</div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card form-card">
          <h2 className="card-title">Customer and request</h2>
          <div className="card-body form">
            {field('customerName', 'Customer name', (
              <input
                value={values.customerName}
                onChange={(e) => update('customerName', e.target.value)}
                className={fieldErrors.customerName ? 'invalid' : ''}
                autoFocus
              />
            ))}
            {field('contact', 'Contact (email or phone)', (
              <input
                value={values.contact}
                onChange={(e) => update('contact', e.target.value)}
                className={fieldErrors.contact ? 'invalid' : ''}
              />
            ))}
            {field('subject', 'Subject', (
              <input
                value={values.subject}
                onChange={(e) => update('subject', e.target.value)}
                className={fieldErrors.subject ? 'invalid' : ''}
              />
            ))}
            {field('description', 'Description', (
              <textarea
                rows={4}
                value={values.description}
                onChange={(e) => update('description', e.target.value)}
                className={fieldErrors.description ? 'invalid' : ''}
              />
            ))}
            {field('priority', 'Priority (optional)', (
              <select value={values.priority} onChange={(e) => update('priority', e.target.value)}>
                <option value="">Not set</option>
                <option value="High">▲ High</option>
                <option value="Low">Low</option>
              </select>
            ))}

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
                {duplicateId && (
                  <>
                    {' '}<Link to={`/inquiries/${duplicateId}`}>Open inquiry #{duplicateId}</Link>
                  </>
                )}
              </div>
            )}

            <div className="btn-row">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save inquiry'}
              </button>
              <Link to="/inquiries" className="btn">Cancel</Link>
            </div>
          </div>
        </form>
      </main>
    </>
  )
}
