
import type { Coord, OpAdd, OpErase, Operation } from "../../types/types"

// types
interface CoordPoint {
    lx: number
    ly: number

    rx: number
    ry: number
}

interface Stroke {
    id: string
    color: string
    baseWidth: number
    points: Coord[]
    element: SVGPathElement
}

type Tool = "draw" | "erase"

// elements
const tsCanvas = document.getElementById("tsCanvas") as unknown as SVGSVGElement
const tsViewport = document.getElementById("tsViewport") as HTMLElement
const tsWorld = document.getElementById("tsWorld") as HTMLElement

// state
const tsCanvasWidth: number = 10000
const tsCanvasHeight: number = 10000
const tsScaleMin: number = 0.08
const tsScaleMax: number = 8
const tsEraserScreenPx: number = 18

const tsOperations: Operation[] = []

let panX: number = 0
let panY: number = 0
let scale: number = 1

let tool: Tool = "draw"

let strokeColor = "#000000"
let strokeWidth: number = 3
let strokes: Stroke[] = []
let points: Coord[] = []
let currentElement: SVGPathElement | null = null

let isPanning: boolean = false
let panStart: Coord | null = null

// util methods
function screenToCanvas(x: number, y: number): Coord {
    return {
        x: (x - panX) / scale,
        y: (y - panY) / scale
    }
}

function width(baseWidth: number) {
    return baseWidth * 0.5
}

// methods
function init() {
    const vw = window.innerWidth
    const vh = window.innerHeight

    scale = Math.min(vw / tsCanvasWidth, vh / tsCanvasHeight) * 5
    panX = (vw - tsCanvasWidth * scale) / 2
    panY = (vh - tsCanvasHeight * scale) / 2

    applyTransform()
}

function setTool(t: Tool) {
    tool = t
    tsViewport.classList.remove("drawing", "erasing")
    
    if (t === "draw") tsViewport.classList.add("drawing")
    if (t === "erase") tsViewport.classList.add("erasing")
}

function applyTransform() {
    tsWorld.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`
}

function zoom(factor: number, x: number, y: number) {
    const ns = Math.max(tsScaleMin, Math.min(tsScaleMax, scale * factor))
    const ratio = ns / scale 

    panX = x - (x - panX) * ratio
    panY = y - (y - panY) * ratio

    scale = ns
    applyTransform()
}

function createStrokePath(color: string, id: string): SVGPathElement {
    const element = document.createElementNS('http://www.w3.org/2000/svg', "path")

    element.setAttribute("fill", "none")
    element.setAttribute("stroke", color)
    element.setAttribute("stroke-linecap", "round")
    element.setAttribute("stroke-linejoin", "round")
    element.setAttribute("stroke-width", String(strokeWidth))
    element.dataset.id = id

    tsCanvas.appendChild(element)
    return element
}

function updateStrokePath(element: SVGPathElement, pts: Coord[], baseWidth: number) {
    if (pts.length < 2) return

    let d = `M ${pts[0]?.x} ${pts[0]?.y}`
    for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i]?.x} ${pts[i]?.y}`
    }

    element.setAttribute("d", d)
    element.setAttribute("d", outlineToPath(pts, baseWidth))
}

function splitStrokeByCircle(points: Coord[], x: number, y: number, r: number) {
    let aHit = false
    const inside = points.map(p => {
        const hit = Math.hypot(p.x - x, p.y - y) < r
        if (hit) aHit = true
        return hit
    })

    if (!aHit) return [points]

    const seg: Coord[][] = []
    let current: Coord[] = []

    for (let i = 0; i < points.length; i++) {
        if (!inside[i]) {
            current.push(points[i]!)
        } else {
            if (current.length >= 2) {
                seg.push(current)
            }
            current = []
        }
    } 

    if (current.length >= 2) {
        seg.push(current)
    }

    return seg
}

function buildOutline(pts: Coord[], baseWidth: number): CoordPoint[] {
    const n = pts.length

    const lengths: number[] = [0]
    for (let i = 1; i < n; i++) {
        lengths.push(lengths[i - 1]! + Math.hypot(pts[i]?.x! - pts[i - 1]?.x!, pts[i]?.y! - pts[i - 1]?.y!))
    }
    const total = lengths[n - 1] || 1

    return pts.map((p, i) => {
        const t = lengths[i]! / total
        const hw = width(baseWidth)

        const prev = pts[Math.max(0, i - 1)]
        const next = pts[Math.min(n - 1, i + 1)]

        const dx = next?.x! - prev?.x!
        const dy = next?.y! - prev?.y!

        const len = Math.hypot(dx, dy) || 1

        const nx = -dy / len
        const ny = dx / len

        return {
            lx: p.x + nx * hw,
            ly: p.y + ny * hw,
            rx: p.x - nx * hw,
            ry: p.y - ny * hw
        }
    })
}

function outlineToPath(pts: Coord[], baseWidth: number) {
    const outline = buildOutline(pts, baseWidth)
    const n = outline.length
    const capr = baseWidth * 0.5

    let d = `M ${outline[0]?.lx} ${outline[0]?.ly}`
    for (let i = 1; i < n; i++) {
        d += ` L ${outline[i]?.lx} ${outline[i]?.ly}`
    }

    const last = outline[n - 1]
    const lastMid = {
        x: (last?.lx! + last?.rx!) / 2,
        y: (last?.ly! + last?.ry!) / 2
    }
    d += ` A ${capr} ${capr} 0 0 1 ${lastMid.x} ${lastMid.y}`
    d += ` A ${capr} ${capr} 0 0 1 ${last?.rx} ${last?.ry}`

    for (let i = n - 2; i >= 0; i--) {
        d += ` L ${outline[i]?.rx} ${outline[i]?.ry}`
    }

    const first = outline[0]
    const firstMid = {
        x: (first?.lx! + first?.rx!) / 2,
        y: (first?.ly! + first?.ry!) / 2
    }
    d += ` A ${capr} ${capr} 0 0 1 ${firstMid.x} ${firstMid.y}`
    d += ` A ${capr} ${capr} 0 0 1 ${first?.lx} ${first?.ly}`

    return d + " Z"
}

function eraseAt(x: number, y: number) {
    const r = tsEraserScreenPx / scale
    const nextStrokes: Stroke[] = []
    const erasedIds: string[] = []
    const replacements: OpErase["replacements"] = []

    for (const s of strokes) {
        const seg = splitStrokeByCircle(s.points, x, y, r)

        if (seg.length === 1 && seg[0] === s.points) {
            nextStrokes.push(s)
            continue
        }

        s.element.remove()
        erasedIds.push(s.id)

        for (const sg of seg) {
            if (sg.length < 2) continue

            const id = crypto.randomUUID()
            const element = createStrokePath(s.color, id)
            updateStrokePath(element, sg, s.baseWidth)

            replacements.push({
                id,
                color: s.color,
                baseWidth: s.baseWidth,
                points: sg,
            })

            nextStrokes.push({
                id,
                color: s.color,
                baseWidth: s.baseWidth,
                points: sg,
                element
            })
        }
    }

    if (erasedIds.length > 0) {
        tsOperations.push({ op: "erase", ids: erasedIds, replacements })
    }

    strokes = nextStrokes
}

// listeners
tsViewport?.addEventListener('contextmenu', e => e.preventDefault())
tsViewport?.addEventListener('pointerdown', (e: PointerEvent) => {
    tsViewport.setPointerCapture(e.pointerId)

    if (e.button === 2) {
        isPanning = true
        panStart = { x: e.clientX - panX, y: e.clientY - panY}
        tsViewport.classList.add("grabbing")
        return
    }

    if (e.button !== 0) return

    if (tool === "draw") {
        const p = screenToCanvas(e.clientX, e.clientY)
        points = [p]
        currentElement = createStrokePath(strokeColor, crypto.randomUUID())
    } else if (tool === "erase") {
        const p = screenToCanvas(e.clientX, e.clientY)
        eraseAt(p.x, p.y)
    }
})

tsViewport?.addEventListener('pointermove', e => {
    if (isPanning && panStart) {
        panX = e.clientX - panStart.x
        panY = e.clientY - panStart.y
        applyTransform()
        return
    }

    if (!(e.buttons & 1)) return

    if (tool === "draw" && currentElement) {
        const p = screenToCanvas(e.clientX, e.clientY)
        const prev = points[points.length - 1]

        if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > 1 / scale) {
            points.push(p)
            updateStrokePath(currentElement, points, strokeWidth)
        }
    } else if (tool === "erase") {
        const p = screenToCanvas(e.clientX, e.clientY)
        eraseAt(p.x, p.y)
    }
})

tsViewport?.addEventListener('pointerup', e => {
    if (e.button === 2 || e.button === 1) {
        isPanning = false
        panStart = null

        tsViewport.classList.remove('grabbing')
        setTool(tool)
        return
    }

    if (tool === "draw" && currentElement) {
        if (points.length >= 2) {
            const id = currentElement.dataset.id!
            strokes.push({ id, color: strokeColor, baseWidth: strokeWidth, points, element: currentElement })

            tsOperations.push({ op: "add", id, color: strokeColor, baseWidth: strokeWidth, points }) 
        } else {
            currentElement.remove()
        }

        points = []
        currentElement = null
    }
})

tsViewport.addEventListener('wheel', e => {
    e.preventDefault()
    zoom(e.deltaY < 0 ? 1.1 : 0.91, e.clientX, e.clientY)
}, { passive: false })

setTool("draw")
init()


// administrator saving (must be authenticated)
document.getElementById("saveButton")?.addEventListener("click", async () => {
    const payload = JSON.stringify({ ops: tsOperations })

    const stream = new CompressionStream("gzip")
    const writer = stream.writable.getWriter()
    writer.write(new TextEncoder().encode(payload))
    writer.close()

    const compressed = await new Response(stream.readable).arrayBuffer()

    const res = await fetch(`/d/save`, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "X-Content-Encoding": "gzip"
        },
        body: compressed
    })

    if (res.ok) {
        alert("Saved successfully!")
        window.location.reload()
    } else {
        alert("Failed to save!")
    }
})

function replayOps(ops: Operation[]) {
    const strokeMap = new Map<string, Stroke>()

    for (const op of ops) {
        if (op.op === "add") {
            const element = createStrokePath(op.color, op.id)
            element.setAttribute("stroke-width", String(op.baseWidth))
            updateStrokePath(element, op.points, op.baseWidth)
            const stroke = { id: op.id, color: op.color, baseWidth: op.baseWidth, points: op.points, element }
            strokeMap.set(op.id, stroke)
        } else if (op.op === "erase") {
            for (const id of op.ids) {
                strokeMap.get(id)?.element.remove()
                strokeMap.delete(id)
            }
            for (const r of op.replacements) {
                const element = createStrokePath(r.color, r.id)
                element.setAttribute("stroke-width", String(r.baseWidth))
                updateStrokePath(element, r.points, r.baseWidth)
                strokeMap.set(r.id, { ...r, element })
            }
        }
    }

    strokes = Array.from(strokeMap.values())
}


(window as any).replayOps = replayOps