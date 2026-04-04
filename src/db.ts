
import type { DrawingRecord } from "../types/types"
import mysql from "mysql2/promise"

export default class DatabaseService {
    private database!: mysql.Connection
    private drawing: DrawingRecord = { ops: [], strokes: [] }

    constructor(config: mysql.ConnectionOptions) {
        this.init(config)
    }

    public async init(config: mysql.ConnectionOptions) {
        this.database = await mysql.createConnection(config)

        await this.database.execute(`
            CREATE TABLE IF NOT EXISTS drawings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                data JSON NOT NULL
            )
        `)

        const [ rows ] = await this.database.execute<mysql.RowDataPacket[]>(
            "SELECT data FROM drawings WHERE id = 1"
        )

        this.drawing = rows.length > 0 ? rows[0]?.data : { ops: [], strokes: [] } 
    }

    public getDrawing(): DrawingRecord { return this.drawing }

    public async saveDrawing(drawing: DrawingRecord): Promise<Boolean> {
        const merged: DrawingRecord = {
            ops: [...this.drawing.ops, ...drawing.ops],
            strokes: drawing.strokes 
        }

        this.drawing = merged

        const [ result ] = await this.database.execute<mysql.ResultSetHeader>(
            "INSERT INTO drawings(id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
            [JSON.stringify(merged)]
        )

        return result.affectedRows > 0
    }

    public async close() {
       await this.database.end() 
    }
}