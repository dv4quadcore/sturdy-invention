'use strict';

var express = require('express')
var http    = require('http')
var https   = require('https')
var socket  = require('socket.io')

var app = express()
var server = http.Server(app)
var io = socket(server)

var  username = "pizza";
var  password = "kittens";
var  auth = "Basic " + new Buffer(username + ':' + password).toString('base64');

app.use(express.static(__dirname+'/lib'))

app.get('/', function(req, res) {
    res.sendFile(__dirname+'/index.html')
})

var items = []
io.on('connection', function(socket){
    socket.on('request stocks', function(){
        io.emit('send stocks', items)
    })
    socket.on('remove stock', function(index){
        console.log('removing stock...')
        items.splice(index, 1)
        io.emit('remove stock', index)
    })
    socket.on('request stock', function(stockName){
        new Promise(function(resolve, reject){
            console.log('requesting '+stockName)
            let request = https.request({
                method: "GET",
                host: "api.intrinio.com",
                path: "/prices?ticker="+stockName,
                headers: { "Authorization": auth }
            }, function(res){
                let body = ''
                res.on('data', function(data){body+=data})
                res.on('end', function(){
                    let data = JSON.parse(body).data
                    resolve(data) 
                })
            }).on('error', function(e){ reject(e.message) })
            request.end()
        }).then(function(data){
            console.log('sending stock...')
            var item = { 
                name: stockName, 
                data: data
            }
            items.push(item)
            io.emit('send stock', item)
        })
    })

})

const port = process.env.PORT || 3000
server.listen(port , function() {
  console.log('listening on *:'+port);
})