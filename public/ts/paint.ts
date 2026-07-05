
import type { Coord, Operation } from "../../types/types"

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
    element: SVGPathElement | SVGGElement
}

type Tool = "pencil" | "marker" | "erase" | "move"
type Undo = 
    | { kind: "add", stroke: Stroke, op: Operation }
    | { kind: "erase", strokes: Stroke[], op: Operation }

// elements
const tsCanvas = document.getElementById("tsCanvas") as unknown as SVGSVGElement
const tsViewport = document.getElementById("tsViewport") as HTMLElement
const tsWorld = document.getElementById("tsWorld") as HTMLElement

// toolbar
const tsBtnMove = document.getElementById("tsBtnMove") as HTMLButtonElement
const tsBtnMarker = document.getElementById("tsBtnMarker") as HTMLButtonElement
const tsBtnPencil = document.getElementById("tsBtnPencil") as HTMLButtonElement
const tsBtnErase = document.getElementById("tsBtnErase") as HTMLButtonElement

const tsBrushSizeSlider = document.getElementById("tsBrushSizeSlider") as HTMLInputElement
const tsBrushSizeLabel = document.getElementById("tsBrushSizeLabel") as HTMLSpanElement

const tsBtnColorBlue = document.getElementById("tsBtnColorBlue") as HTMLButtonElement
const tsBtnColorBlack = document.getElementById("tsBtnColorBlack") as HTMLButtonElement
const tsBtnColorPicker = document.getElementById("tsBtnColorPicker") as HTMLButtonElement
const tsColorPickerInput = document.getElementById("tsColorPickerInput") as HTMLInputElement

// popup & extra buttons
const tsPopup = document.getElementById("tsPopup") as HTMLElement
const tsPopupClose = document.getElementById("tsPopupClose") as HTMLButtonElement
const tsButtonSlack = document.getElementById("tsButtonSlack") as HTMLButtonElement
const tsPopupSlack = document.getElementById("tsPopupSlack") as HTMLButtonElement

const openSlack = () => window.open("https://hackclub.enterprise.slack.com/archives/C09B42CLL72", "_blank")

// undo / redo
const undoStack: Undo[] = []
const redoStack: Undo[] = []

// state
const tsCanvasWidth: number = 10000
const tsCanvasHeight: number = 10000
const tsScaleMin: number = 0.08
const tsEraserScreenPx: number = 24
var tsScaleMax: number = 8

const tsOperations: Operation[] = []

let panX: number = 0
let panY: number = 0
let scale: number = 1

let tool: Tool = "pencil"
let strokeColor = "#000000"
let strokeWidth: number = 3
let strokes: Stroke[] = []
let points: Coord[] = []
let currentElement: SVGPathElement | null = null

let isPanning: boolean = false
let panStart: Coord | null = null

let tsIsPinching: boolean = false
let tsLastTouchDistance: number | null = null

// util
function screenToCanvas(x: number, y: number): Coord {
    return { x: (x - panX) / scale, y: (y - panY) / scale }
}

function width(baseWidth: number) { 
    return baseWidth * 0.5 
}

function isOnMobile() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
        navigator.userAgent
    )
}

function undo() {
    const action = undoStack.pop()
    if (!action) return

    tsOperations.pop()
    if (action.kind === "add") {
        action.stroke.element.remove()
        strokes = strokes.filter(s => s.id !== action.stroke.id)
    } else {
        for (const s of action.strokes) {
            tsCanvas.appendChild(s.element)
            strokes.push(s)
        }
    }
    
    redoStack.push(action)
}

function redo() {
    const action = redoStack.pop()
    if (!action) return

    tsOperations.push(action.op)
    if (action.kind === "add") {
        tsCanvas.appendChild(action.stroke.element)
        strokes.push(action.stroke)
    } else {
        const ids = new Set(action.strokes.map(s => s.id))
        for (const s of action.strokes) {
            s.element.remove()
        }
        strokes = strokes.filter(s => !ids.has(s.id))
    }
    
    undoStack.push(action)
}

// center it based off the users viewport
function init() {
    if (localStorage.getItem("nonononodontshowmethatpopupeveragainoriwillcallmylawyersandsaythatyouareameanie") === "true") {
        tsPopup.style.display = "none"
    }

    tsBrushSizeLabel.innerText = String(tsBrushSizeSlider?.value)

    const vw = window.innerWidth
    const vh = window.innerHeight

    scale = Math.min(vw / tsCanvasWidth, vh / tsCanvasHeight) * 5

    if (isOnMobile()) {
        const toolbar = document.getElementById("tsToolbar")
        if (toolbar) {
            toolbar.style.visibility = "hidden"
        }

        setTool("move")

        tsScaleMax *= 5
    } else {
        setColor("#000000")
        setTool("pencil")
    }

    panX = (vw - tsCanvasWidth * scale) / 2
    panY = (vh - tsCanvasHeight * scale) / 2

    applyTransform()
}

function setTool(t: Tool) {
    tool = t
    tsViewport.classList.remove("penciling", "erasing", "moving", "markering")
    tsBtnMove?.classList.remove("active")
    tsBtnPencil?.classList.remove("active")
    tsBtnMarker?.classList.remove("active")
    tsBtnErase?.classList.remove("active")

    if (t === "move") { 
        tsViewport.classList.add("moving")    
        tsBtnMove?.classList.add("active") 
    }
    if (t === "pencil") {
        tsViewport.classList.add("penciling")
        tsBtnPencil?.classList.add("active") 
    }
    if (t === "marker") { 
        tsViewport.classList.add("markering")
        tsBtnMarker?.classList.add("active") 
    }
    if (t === "erase") { 
        tsViewport.classList.add("erasing")
        tsBtnErase?.classList.add("active")
    }
}

function setColor(color: string) {
    strokeColor = color
    tsBtnColorBlack?.classList.remove("active")
    tsBtnColorBlue?.classList.remove("active")
    tsBtnColorPicker?.classList.remove("active")

    if (color === "#0f39c5") {
        tsBtnColorBlue?.classList.add("active")
    } else if (color === "#000000") {
        tsBtnColorBlack?.classList.add("active")
    } else {
        tsBtnColorPicker?.classList.add("active")
        const swatch = tsBtnColorPicker.querySelector(".tsColorSwitch") as HTMLElement
        if (swatch) swatch.style.backgroundColor = color
    }
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

// creates line
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
    element.setAttribute("d", outlineToPath(pts, baseWidth))
}

function buildOutline(pts: Coord[], baseWidth: number): CoordPoint[] {
    const n = pts.length
    // const lengths: number[] = [0]
    // for (let i = 1; i < n; i++) {
    //     lengths.push(lengths[i-1]! + Math.hypot(pts[i]!.x - pts[i-1]!.x, pts[i]!.y - pts[i-1]!.y))
    // }

    return pts.map((p, i) => {
        const hw = width(baseWidth)
        const prev = pts[Math.max(0, i-1)]!
        const next = pts[Math.min(n-1, i+1)]!
        const dx = next.x - prev.x
        const dy = next.y - prev.y
        const len = Math.hypot(dx, dy) || 1
        const nx = -dy / len
        const ny = dx / len

        return { lx: p.x + nx*hw, ly: p.y + ny*hw, rx: p.x - nx*hw, ry: p.y - ny*hw }
    })
}

function outlineToPath(pts: Coord[], baseWidth: number) {
    const outline = buildOutline(pts, baseWidth)
    const n = outline.length
    const capr = baseWidth * 0.5

    let d = `M ${outline[0]!.lx} ${outline[0]!.ly}`
    for (let i = 1; i < n; i++) d += ` L ${outline[i]!.lx} ${outline[i]!.ly}`

    const last = outline[n-1]!
    const lastMid = { x: (last.lx + last.rx)/2, y: (last.ly + last.ry)/2 }
    d += ` A ${capr} ${capr} 0 0 1 ${lastMid.x} ${lastMid.y}`
    d += ` A ${capr} ${capr} 0 0 1 ${last.rx} ${last.ry}`

    for (let i = n-2; i >= 0; i--) d += ` L ${outline[i]!.rx} ${outline[i]!.ry}`

    const first = outline[0]!
    const firstMid = { x: (first.lx + first.rx)/2, y: (first.ly + first.ry)/2 }
    d += ` A ${capr} ${capr} 0 0 1 ${firstMid.x} ${firstMid.y}`
    d += ` A ${capr} ${capr} 0 0 1 ${first.lx} ${first.ly}`

    return d + " Z"
}

function createMarkerPath(color: string, id: string): SVGPathElement {
    const element = document.createElementNS('http://www.w3.org/2000/svg', "path")

    element.setAttribute("fill", "none")
    element.setAttribute("stroke", color)
    element.setAttribute("stroke-linecap", "square")
    element.setAttribute("stroke-linejoin", "round")
    element.setAttribute("stroke-width", String(strokeWidth * 5))
    element.setAttribute("opacity", "0.35")
    element.dataset.id = id

    tsCanvas.appendChild(element)
    return element
}

function updateMarkerPath(element: SVGPathElement, pts: Coord[]) {
    if (pts.length < 2) return

    let d = `M ${pts[0]!.x} ${pts[0]!.y}`
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i]!.x} ${pts[i]!.y}`

    element.setAttribute("d", d)
}

function eraseAt(x: number, y: number) {
    const r = tsEraserScreenPx / scale
    const nextStrokes: Stroke[] = []
    const erased: Stroke[] = []

    for (const s of strokes) {
        const hit = s.points.some(p => Math.hypot(p.x - x, p.y - y) < r)
        if (hit) {
            s.element.remove()
            erased.push(s)
        } else {
            nextStrokes.push(s)
        }
    }

    if (erased.length > 0) {
        const op: Operation = { op: "erase", ids: erased.map(s => s.id), replacements: []}
        tsOperations.push(op)
        undoStack.push({ kind: "erase", strokes: erased, op })
        redoStack.length = 0
    }

    strokes = nextStrokes
}

// listeners
tsViewport?.addEventListener('contextmenu', e => e.preventDefault())

tsViewport?.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.target instanceof Element && e.target.closest('button, input, #tsPopup, #tsToolbar, .tsButtons')) return

    tsViewport.setPointerCapture(e.pointerId)

    if (tool === "move" || e.button === 2) {
        isPanning = true
        panStart = { x: e.clientX - panX, y: e.clientY - panY }
        tsViewport.classList.add("grabbing")
        return
    }

    if (e.button !== 0) return

    if (tool === "pencil") {
        const p = screenToCanvas(e.clientX, e.clientY)
        points = [p]
        currentElement = createStrokePath(strokeColor, crypto.randomUUID())
    } else if (tool === "marker") {
        const p = screenToCanvas(e.clientX, e.clientY)
        points = [p]
        currentElement = createMarkerPath(strokeColor, crypto.randomUUID())
    } else if (tool === "erase") {
        const p = screenToCanvas(e.clientX, e.clientY)
        eraseAt(p.x, p.y)
    }
})

tsViewport?.addEventListener('pointercancel', () => {
    isPanning = false
    panStart = null
    tsViewport.classList.remove('grabbing')
})

tsViewport?.addEventListener('pointermove', e => {
    if (tsIsPinching) return

    if (isPanning && panStart) {
        panX = e.clientX - panStart.x
        panY = e.clientY - panStart.y
        applyTransform()
        return
    }

    if (!(e.buttons & 1)) return

    if (tool === "pencil" && currentElement) {
        const p = screenToCanvas(e.clientX, e.clientY)
        const prev = points[points.length - 1]

        if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > 1 / scale) {
            points.push(p)
            updateStrokePath(currentElement, points, strokeWidth)
        }
    } else if (tool === "marker" && currentElement) {
        const p = screenToCanvas(e.clientX, e.clientY)
        const prev = points[points.length - 1]

        if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > 1 / scale) {
            points.push(p)
            updateMarkerPath(currentElement, points)
        }
    } else if (tool === "erase") {
        const p = screenToCanvas(e.clientX, e.clientY)

        eraseAt(p.x, p.y)
    }
})

tsViewport?.addEventListener('pointerup', e => {
    if (isPanning) {
        isPanning = false
        panStart = null

        tsViewport.classList.remove('grabbing')
        setTool(tool)
        return
    }

    if (tool === "pencil" && currentElement) {
        if (points.length >= 2) {
            const id = currentElement.dataset.id!

            const stroke: Stroke = { id, color: strokeColor, baseWidth: strokeWidth, points, element: currentElement }
            const op: Operation = { op: "add", type: "pencil", id, color: strokeColor, baseWidth: strokeWidth, points }
            
            strokes.push(stroke)
            tsOperations.push(op)
            undoStack.push({ kind: "add", stroke, op })
            redoStack.length = 0
        } else {
            currentElement.remove()
        }

        points = []
        currentElement = null
    } else if (tool === "marker" && currentElement) {
        if (points.length >= 2) {
            const id = currentElement.dataset.id!
            const mw = strokeWidth * 5

            strokes.push({ id, color: strokeColor, baseWidth: mw, points, element: currentElement })
            tsOperations.push({ op: "add", type: "marker", id, color: strokeColor, baseWidth: mw, points })
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

tsButtonSlack?.addEventListener("click", openSlack)
tsPopupSlack?.addEventListener("click", openSlack)

tsPopupClose.addEventListener('click', e => {
    localStorage.setItem("nonononodontshowmethatpopupeveragainoriwillcallmylawyersandsaythatyouareameanie", "true")

    tsPopup.style.display = "none"
})

// keybinds
document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase()
        if (k === "z") {
            e.preventDefault()
            e.shiftKey ? redo(): undo()
        }

        if (k === "y") {
            e.preventDefault()
            redo()
        }

        return
    }

    if (e.key === "1") setTool("move")
    if (e.key === "2") setTool("marker")
    if (e.key === "3") setTool("pencil")
    if (e.key === "4") setTool("erase")
})

tsBtnMove?.addEventListener("click", () => setTool("move"))
tsBtnPencil?.addEventListener("click", () => setTool("pencil"))
tsBtnMarker?.addEventListener("click", () => setTool("marker"))
tsBtnErase?.addEventListener("click", () => setTool("erase"))

tsBrushSizeSlider?.addEventListener("input", () => {
    const inputSize = parseInt(tsBrushSizeSlider.value)

    // try to get by this one n0o0b090lv!
    if (inputSize > 40) { 
        strokeWidth = 40
        tsBrushSizeLabel.textContent = ">:)"
    } else if (inputSize < -40) {
        strokeWidth = -40
        tsBrushSizeLabel.textContent = ">:("
    } else {
        strokeWidth = inputSize
        tsBrushSizeLabel.textContent = String(strokeWidth)
    }
})

tsBtnColorBlack?.addEventListener("click", () => setColor("#000000"))
tsBtnColorBlue?.addEventListener("click", () => setColor("#0f39c5"))
tsBtnColorPicker?.addEventListener("click", () => tsColorPickerInput?.click())
tsColorPickerInput?.addEventListener("input", () => {
    setColor(tsColorPickerInput.value)

    tsBtnColorPicker.style.background = tsColorPickerInput.value
})

// mobile
tsViewport.addEventListener("touchstart", e => { 
    if (e.touches.length === 2) {
        tsIsPinching = true

        tsLastTouchDistance = Math.hypot(
            e.touches[1]!.clientX - e.touches[0]!.clientX,
            e.touches[1]!.clientY - e.touches[0]!.clientY,
        )
    }

    if (currentElement) {
        currentElement.remove()
        currentElement = null
        points = []
    }
}, { passive: true })

tsViewport.addEventListener("touchmove", e => {
    e.preventDefault()

    if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[1]!.clientX - e.touches[0]!.clientX,
            e.touches[1]!.clientY - e.touches[0]!.clientY,
        )

        if (tsLastTouchDistance !== null) {
            const midX = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2
            const midY = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2

            zoom(dist / tsLastTouchDistance, midX, midY)
        }

        tsLastTouchDistance = dist
    }
}, { passive: false })

tsViewport.addEventListener("touchend", e => {
    if (e.touches.length < 2) {
        tsIsPinching = false
        tsLastTouchDistance = null
    }
}, { passive: true })

// save
document.getElementById("tsSaveButton")?.addEventListener("click", async () => {
    const payload = JSON.stringify({ ops: tsOperations })
    const stream = new CompressionStream("gzip")
    const writer = stream.writable.getWriter()

    writer.write(new TextEncoder().encode(payload))
    writer.close()

    const compressed = await new Response(stream.readable).arrayBuffer()

    const res = await fetch(`/d/save`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "X-Content-Encoding": "gzip" },
        body: compressed
    })

    if (res.ok) { alert("Saved successfully!"); window.location.reload() }
    else alert("Failed to save!")
})

function replayOps(ops: Operation[]) {
    const strokeMap = new Map<string, Stroke>()

    for (const op of ops) {
        if (op.op === "add") {
            let element: SVGPathElement | SVGGElement

            if (op.type === "marker") {
                element = createMarkerPath(op.color, op.id)
                updateMarkerPath(element as SVGPathElement, op.points)

            } else {
                element = createStrokePath(op.color, op.id)
                element.setAttribute("stroke-width", String(op.baseWidth))
                updateStrokePath(element as SVGPathElement, op.points, op.baseWidth)
            }

            strokeMap.set(op.id, { id: op.id, color: op.color, baseWidth: op.baseWidth, points: op.points, element })
        } else if (op.op === "erase") {
            for (const id of op.ids) { strokeMap.get(id)?.element.remove(); strokeMap.delete(id) }
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
init()