import express, { Request, Response } from "express"
import dotenv from "dotenv"
import cors from "cors"
import helmet from "helmet"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the Express + TypeScript Backend!" })
})

app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("OK")
})

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
