// let $ = require('jquery/src/core')
//require('jquery/src/core/init')
import $ from "jquery/src/core" 
import 'jquery/src/core/init'
import 'jquery/src/core/ready'
import 'jquery/src/core/parseHTML'
import 'jquery/src/attributes/attr'
import 'jquery/src/attributes/classes'
import 'jquery/src/attributes/val'
import 'jquery/src/manipulation'
import 'jquery/src/event/alias'
import 'jquery/src/traversing/findFilter'


//let Highcharts = require('highcharts/highstock')
import Highcharts from 'highcharts/highstock'
// -------------------------------------------------------------------

let socket = io();

const _stockChart = 
      `<div id="chart-container" 
            style="height: 400px; 
            min-width: 310px"></div>`
function StockChart(template) {
  const id = template.attr('id')
  var c = Highcharts.stockChart(id, {
    rangeSelector: {
      selected: 4
    },
    yAxis: {
      labels: {
        formatter: function() {
          return (this.value > 0 ? ' + ' : '') + this.value + '%';
        }
      },
      plotLines: [{
        value: 0,
        width: 2,
        color: 'silver'
      }]
    },
    plotOptions: {
      series: {
        compare: 'percent',
        showInNavigator: true
      }
    },
    navigator: {
      enabled: false
    },
    tooltip: {
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
      valueDecimals: 2,
      split: true
    },
    credits: {
      enabled: false
    }
  })

  return {
    addSeries: (name, data)=>{
       c.addSeries({name: name, data: data}, true)
    },
    removeSeries: (index)=>{
      c.series[index].remove()
    }
  }
}

const _stockItem = (input) => {
  return `<div class="animated fadeInRight stock-item">
            <div id="remove">x</div>
            <h1 id="name">` + input + `</h1>
            <p>(`+ input +`) Prices, Dividends, Splits and Trading Volume</p>
          </div>`
}
function StockItem(template){
  const name = template.find('#name').text()
  return Object.freeze({
    name: name,
    template: template,
    getIndex: (arr)=>{
      const result = arr.map((stockItem, index)=>{
          return (stockItem.name === name) ? index : -1
        }).filter((num)=>{ return (num!==-1)})[0]
      return result
    }
  })
}

const _stockItemCollection = '<div id="stock-items"></div>'
function StockItemCollection(template, chart, onClickRemoveStockItem){
  var items = []
  const remove = (getIndex)=> {
      const index = getIndex(items)
      chart.removeSeries(index)
      let div = items[index].template
      div.removeClass("fadeInRight")
         .addClass("fadeOutLeft")
      setTimeout(() => { div.remove() }, 500)
      items.splice(index, 1)
  }
  const add = (getInput) => {
      const input = getInput()
      const $stockItem = $(_stockItem(input))
      const stockItem = StockItem($stockItem)
      const index = items.length
      items.push(stockItem)
      onClickRemoveStockItem($stockItem, (ev)=>{
        console.log('click remove!')
        socket.emit('remove stock', index)
      })
      template.append($stockItem)
  }
  
  return Object.freeze({
    add: add,
    remove: remove,
    getItems: ()=>{ return items }
  })
}

const _stockAdd =
    `<div id="stock-add">
      <div id="container">
        <p id="description"><b>Syncs with other clients in realtime</b></p></br>
        <input id="field" type="text" name="firstname">
        <button id="add">Add</button>
      </div>
    </div>`
function StockItemInserter(template, onClickAddStockItem){
  const add = () => {
    socket.emit('request stock', 
      template.find('#container #field').val().toUpperCase())
  }

  onClickAddStockItem(template, add)

  return Object.freeze({
    add: (input)=>{
      socket.emit('request stock', input.toUpperCase())
    }
  })
 }

// Main
function _main() {
  
  // Templates => JQuery Elements
  const $chart      = $(_stockChart)
  const $collection = $(_stockItemCollection)
  const $inserter   = $(_stockAdd)
  
  // Render JQuery Elements to HTML Document
  $('ui-view').append($chart)
              .append($collection)
              .after ($inserter)
  
  // Bind User Inputs to View Actions
  const onClickAddStockItem = ($inserter, cb) => { $inserter.find('#add').click(cb) }
  const onClickRemoveStockItem = ($item, cb)  => { $item.find('#remove') .click(cb) }
  
  // JQuery Elements => Modules containing View Actions
  const chart      = StockChart($chart)
  const collection = StockItemCollection($collection, chart, onClickRemoveStockItem)
  const inserter   = StockItemInserter($inserter, onClickAddStockItem)
    
  // Modify as needed
  const sendStock = (res)=> {
    const stamped = res.data.map((_item)=>{
        const item = [_item.date, _item.open]
        const parts = item[0].split('-').map((i)=> { return parseInt(i) })
        const result = ((parts[0] - 1970) * 31556952000 ) 
          + (parts[1] * 2629746000) 
          + (parts[2] * 86400000) 
        return [result, item[1]]
      }).reverse()
    const upperName = res.name.toUpperCase()
    chart.addSeries(upperName, stamped)
    collection.add(()=>{return upperName})
  }

  socket.on('remove stock', (index)=>{
    console.log('removing stock...')
    collection.remove(()=>{ return index; })
  })

  socket.on('send stock', sendStock)

  socket.on('send stocks', (lists)=>{
      console.log('sending existing stocks...')
      if (collection.getItems().length > 0) {
        console.log('exiting send stock...')
        return
      }
      if (lists.length > 0) lists.map(sendStock)
      else socket.emit('request stock', 'AAPL')
  })

  socket.emit('request stocks')
}

$(document).ready(_main)



  

