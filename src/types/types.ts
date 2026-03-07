
export interface Coord {
    x: number
    y: number
}

export interface OpAdd {
    op: "add"
    id: string
    color: string
    baseWidth: number
    points: Coord[]
}

export interface OpErase {
    op: "erase"
    ids: string[]
    replacements: {
        id: string
        color: string
        baseWidth: number
        points: Coord[]
    }[]
}

export type Operation = OpAdd | OpErase

export interface StrokeRecord {
    id: string
    color: string
    baseWidth: number
    points: Coord[]
}

export interface DrawingRecord {
    ops: Operation[]
    strokes: StrokeRecord[]
}

