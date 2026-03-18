
import express, { Router } from "express"
import { promisify } from "util"
import { db } from ".."
import zlib from "zlib"
import type { StrokeRecord } from "../types/types"

const gunzip = promisify(zlib.gunzip)
const router = Router()

router.get("/", (req, res) => {
    res.render(`index`, { drawing: db.getDrawing() })
})

router.post(`/d/save`, async (req, res) => {
    try {
        const decompressed = await gunzip(req.body)
        const parsed = JSON.parse(decompressed.toString("utf-8"))

        const { ops } = parsed

        if (!ops || !Array.isArray(ops)) {
            console.log("Invalid ops:", ops)
            return res.status(400).json({ error: "Invalid data!" })
        }

        const strokeMap = new Map<string, StrokeRecord>()
        for (const op of ops) {
            if (op.op === "add") {
                strokeMap.set(op.id, { id: op.id, color: op.color, baseWidth: op.baseWidth, points: op.points })
            } else if (op.op === "erase") {
                for (const id of op.ids) strokeMap.delete(id)
                for (const r of op.replacements) strokeMap.set(r.id, r)
            }
        }

        const drawing = { ops, strokes: Array.from(strokeMap.values()) as StrokeRecord[] }
        const result = db.saveDrawing(drawing)

        if (!result) return res.status(500).json({ error: "Failed to save drawing!" })

        res.status(200).redirect("/")
    } catch (err) {
        console.error("Save route error:", err) 
        res.status(400).json({ error: "Failed to parse body" })
    }
})

export default router