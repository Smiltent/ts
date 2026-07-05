
import { Router, type Request } from "express"
import { promisify } from "util"
import { db } from ".."
import zlib from "zlib"

const gunzip = promisify(zlib.gunzip)
const router = Router()

const enfoceAdmin = String(process.env.BYPASS_ADMIN) == "true" ? false : true

//
//
//
function getUser(req: Request) {
    const raw = req.signedCookies?.hcsession
    if (!raw) return null

    try {
        return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as {
            id: string
            email: string
            accessToken: string
        }
    } catch {
        return null
    }
}

function isAdminUser(email: string | undefined) {
    if (!email) return false

    const admins = (process.env.ADMIN_EMAILS ?? "").split(";").map(e =>
        e.trim().toLowerCase()
    )

    return admins.includes(email.toLowerCase())
}

//
//
//
router.get("/", (req, res) => {
    const user = getUser(req)
    const isAdmin = isAdminUser(user?.email)

    res.render(`index`, { drawing: db.getDrawing(), isAdmin, user })
})

router.post(`/d/save`, async (req, res) => {
    const user = getUser(req)

    if (!user || (enfoceAdmin && !isAdminUser(user.email))) {
        return res.status(403).send("no") // i couldn't think of a better error message
    }

    try {
        const decompressed = await gunzip(req.body)
        const parsed = JSON.parse(decompressed.toString("utf-8"))

        const { ops } = parsed

        if (!ops || !Array.isArray(ops)) {
            return res.status(400).json({ error: "Invalid data!" })
        }

        // const strokeMap = new Map<string, StrokeRecord>()
        // for (const op of ops) {
        //     if (op.op === "add") {
        //         strokeMap.set(op.id, { id: op.id, color: op.color, baseWidth: op.baseWidth, points: op.points })
        //     } else if (op.op === "erase") {
        //         for (const id of op.ids) strokeMap.delete(id)
        //         for (const r of op.replacements) strokeMap.set(r.id, r)
        //     }
        // }

        // const drawing = { ops, strokes: Array.from(strokeMap.values()) as StrokeRecord[] }
        // const result = db.saveDrawing(drawing)


        const result = db.saveDrawing({ ops })
        if (!result) return res.status(500).json({ error: "Failed to save drawing!" })

        res.sendStatus(200)
    } catch (err) {
        console.error("Save route error:", err) 
        res.status(400).json({ error: "Failed to parse body" })
    }
})

export default router