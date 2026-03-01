
import { Router } from "express"
import { db } from "../.."
const router = Router()

router.get("/", (req, res) => {
    res.render(`index`, { drawing: db.getDrawing() })
})

router.post(`/d/save`, (req, res) => {
    const { svg } = req.body

    if (!svg || typeof svg != "string") {
        return res.status(400).json({ error: "Invalid data!" })
    }

    const result = db.saveDrawing(svg)
    if (!result) {
        return res.status(500).json({ error: "Failed to save drawing!" })
    }

    res.status(200).redirect("/")
})

export default router