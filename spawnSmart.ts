import { spawn } from "child_process";

export async function spawnSmart(cmd: string) {
    const childProcess = spawn(cmd, { shell: true, stdio: "inherit" });
    await new Promise((resolve, reject) => {
        childProcess.on("exit", (code) => {
            if (code === 0) resolve(undefined);
            else reject();
        });
    });
}