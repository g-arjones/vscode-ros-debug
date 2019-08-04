import * as child_process from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function workspaceSetupFile(): string {
    if (process.platform === "win32") {
        return "setup.bat";
    } else {
        return "setup.bash";
    }
}

function findWorkspaceRoot(rootPath: string): string {
    let lastPath = "";
    while (rootPath !== lastPath) {
        if (fs.existsSync(path.join(rootPath, "devel", workspaceSetupFile()))) {
            return rootPath;
        }
        lastPath = rootPath;
        rootPath = path.dirname(rootPath);
    }
    throw new Error(rootPath + ": Could not find the root of the workspace");
}

function findWorkspaceSetupFile(rootPath: string): string {
    return path.join(findWorkspaceRoot(rootPath), "devel", workspaceSetupFile());
}

export interface IEnvLoader {
    env(): Promise<any>;
    reload(): Promise<any>;
}

export class EnvLoader implements IEnvLoader {
    private _cachedEnv: any;
    constructor(private _workspaceFolder: string) {
        this.reload();
    }

    public env(): Promise<any> {
        return this._cachedEnv;
    }

    public reload(addedEnv?: any): Promise<any> {
        this._cachedEnv = new Promise((resolve, reject) => {
            const filename = findWorkspaceSetupFile(this._workspaceFolder);
            let exportEnvCommand: string;
            if (process.platform === "win32") {
                exportEnvCommand = `cmd /c "\"${filename}\" && set"`;
            } else {
                exportEnvCommand = `bash -c "source '${filename}' && env"`;
            }

            const processOptions: child_process.ExecOptions = {
                cwd: this._workspaceFolder,
                env: addedEnv,
            };
            child_process.exec(exportEnvCommand, processOptions, (error, stdout, _stderr) => {
                if (!error) {
                    resolve(stdout.split(os.EOL).reduce((env, line) => {
                        const index = line.indexOf("=");

                        if (index !== -1) {
                            env[line.substr(0, index)] = line.substr(index + 1);
                        }

                        return env;
                    }, {}));
                } else {
                    reject(error);
                }
            });
        });
        return this._cachedEnv;
    }
}
