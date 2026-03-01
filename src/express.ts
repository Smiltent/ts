
import express from "express"
import rootRoutes from "./routes/root.routes"

export default class ExpressService {
    private app: express.Application

    constructor() {
        this.app = express()

        this.app.use("/", rootRoutes)
        this.app.set("view engine", "ejs")

        this.app.use("/public", express.static("public"))

        this.app.listen(3000, () => {
            console.log("Server running on http://0.0.0.0:3000")
        })
    }
}
