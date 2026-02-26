
const tsCanvas = document.getElementById("ts-canvas")
const tsCtx = tsCanvas.getContext("2d")

tsCtx.imageSmoothingEnabled = false
let isTsDrawing = false

function getTsMousePos(e) {
    const tsRect = tsCanvas.getBoundingClientRect()
    const tsScaleX = tsCanvas.width / tsRect.width
    const tsScaleY = tsCanvas.height / tsRect.height

    return {
        x: Math.floor((e.clientX - tsRect.left) * tsScaleX),
        y: Math.floor((e.clientY - tsRect.top) * tsScaleY)  
    }
}

function draw(e) {
    const tsPos = getTsMousePos(e)

    tsCtx.fillRect(tsPos.x, tsPos.y, 1, 1);
}

tsCanvas.addEventListener("mousedown", (e) => {
    isTsDrawing = true
    draw(e)
})

tsCanvas.addEventListener("mousemove", (e) => {
    if (isTsDrawing) draw(e)
})

tsCanvas.addEventListener("mouseup", () => isTsDrawing = false)
tsCanvas.addEventListener("mouseleave", () => isTsDrawing = false)