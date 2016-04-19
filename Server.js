'use strict'

const db = require('./db')
const CONST = require('./constants')
const express = require('express')

class Server {

  /**
  * Starts the server
  */
  start () {
    if (this.express) { return }

    const app = express()
    app.use(express.static('web'))

    app.get('/api/history.json', (req, res) => {
      db.all().then((data) => {
        res.json({ error: null, data: data })
      })
    })

    this.express = app.listen(CONST.SERVER_PORT)
  }
}

module.exports = Server
