
import Database from "bun:sqlite"

export default class DatabaseService {
    private database: Database
    private drawing: string = ""

    constructor(private dbFile: string) {
        this.database = new Database(this.dbFile)

        this.database.run(`
            CREATE TABLE IF NOT EXISTS drawings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                svg TEXT NOT NULL
            )
        `)

        const row = this.database.query("SELECT svg FROM drawings ORDER BY id DESC LIMIT 1").get() as { svg: string } | null
        this.drawing = row?.svg || ""
    }

    public getDrawing() { return this.drawing }
    public saveDrawing(svg: string): Boolean {
        this.drawing = svg

        const stmt = this.database.prepare("INSERT INTO drawings (svg) values (?)")
        const result = stmt.run(svg)

        if (result.changes > 0) {
            return true
        } 
        
        return false
    }
}