
import { spawnSync } from 'child_process'
import { watch } from 'fs'

export default class ListenForFileChanges {
    private cmd: string[]

    constructor(
        private file: string, 
    ) {
        console.log(`Watching file ${file}!`)

        this.cmd = ["bun", "build", file, "--outdir", "public/js/", "--minify"]

        watch(file, (e) => {
            if (e === "change") {
                this.build()
            }
        })
    }

    private build() {
        spawnSync(this.cmd[0] as string, this.cmd.slice(1), { stdio: "inherit" })
    }
}