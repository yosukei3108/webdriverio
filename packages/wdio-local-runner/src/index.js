import path from 'path'
import child from 'child_process'
import EventEmitter from 'events'

import logger from 'wdio-logger'
import RunnerTransformStream from './transformStream'

const log = logger('wdio-local-runner')

export default class LocalRunner extends EventEmitter {
    constructor (configFile, config) {
        super()
        this.configFile = configFile
        this.config = config
    }

    initialise () {}

    run ({ cid, command, configFile, argv, caps, processNumber, specs, server, isMultiremote }) {
        const runnerEnv = Object.assign(this.config.runnerEnv, {
            WDIO_LOG_LEVEL: this.config.logLevel,
            WDIO_LOG_PATH: path.join(this.config.logDir, `wdio-${cid}.log`)
        })

        const childProcess = child.fork(path.join(__dirname, 'run.js'), process.argv.slice(2), {
            cwd: process.cwd(),
            env: runnerEnv,
            execArgv: this.config.execArgv,
            silent: true
        })

        childProcess.on('message', this.emit.bind(this, this.cid))
        childProcess.on('exit', (code) => {
            log.debug(`Runner ${cid} finished with exit code ${code}`)
            this.emit('end', { cid, exitCode: code })
        })

        childProcess.send({
            cid, command, configFile, argv, caps,
            processNumber, specs, server, isMultiremote
        })


        childProcess.stdout.pipe(new RunnerTransformStream(cid)).pipe(process.stdout)
        childProcess.stderr.pipe(new RunnerTransformStream(cid)).pipe(process.stderr)
    }
}