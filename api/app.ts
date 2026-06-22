import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth';
import challengeRoutes from './routes/challenges';
import checkinRoutes from './routes/checkins';
import rankingRoutes from './routes/ranking';
import analyticsRoutes from './routes/analytics';
import certificateRoutes from './routes/certificates';
import pointsRoutes from './routes/points';
import mallRoutes from './routes/mall';
import notificationRoutes from './routes/notifications';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/challenges', challengeRoutes)
app.use('/api/checkins', checkinRoutes)
app.use('/api/ranking', rankingRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/certificates', certificateRoutes)
app.use('/api/points', pointsRoutes)
app.use('/api/mall', mallRoutes)
app.use('/api/notifications', notificationRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
