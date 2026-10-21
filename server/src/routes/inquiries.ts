import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createInquiry, getInquiry, listInquiries } from '../services/inquiries.js'
import { createInquirySchema, idParamSchema, listQuerySchema } from '../validation/inquiries.js'

export const inquiriesRouter = Router()

inquiriesRouter.use(requireAuth)

inquiriesRouter.get('/', async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query)
    res.json({ inquiries: await listInquiries(req.user!, query) })
  } catch (err) {
    next(err)
  }
})

inquiriesRouter.post('/', async (req, res, next) => {
  try {
    const input = createInquirySchema.parse(req.body)
    const inquiry = await createInquiry(req.user!, input)
    res.status(201).json({ inquiry })
  } catch (err) {
    next(err)
  }
})

inquiriesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    res.json({ inquiry: await getInquiry(req.user!, id) })
  } catch (err) {
    next(err)
  }
})
