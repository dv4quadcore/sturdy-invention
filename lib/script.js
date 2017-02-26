'use strict';

var _core = require('jquery/src/core');

var _core2 = _interopRequireDefault(_core);

require('jquery/src/core/init');

require('jquery/src/core/ready');

require('jquery/src/core/parseHTML');

require('jquery/src/attributes/attr');

require('jquery/src/attributes/classes');

require('jquery/src/attributes/val');

require('jquery/src/manipulation');

require('jquery/src/event/alias');

require('jquery/src/traversing/findFilter');

var _highstock = require('highcharts/highstock');

var _highstock2 = _interopRequireDefault(_highstock);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// -------------------------------------------------------------------

var socket = io();

//let Highcharts = require('highcharts/highstock')
// let $ = require('jquery/src/core')
//require('jquery/src/core/init')


var _stockChart = '<div id="chart-container" \n            style="height: 400px; \n            min-width: 310px"></div>';
function StockChart(template) {
  var id = template.attr('id');
  var c = _highstock2.default.stockChart(id, {
    rangeSelector: {
      selected: 4
    },
    yAxis: {
      labels: {
        formatter: function formatter() {
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
  });

  return {
    addSeries: function addSeries(name, data) {
      c.addSeries({ name: name, data: data }, true);
    },
    removeSeries: function removeSeries(index) {
      c.series[index].remove();
    }
  };
}

var _stockItem = function _stockItem(input) {
  return '<div class="animated fadeInRight stock-item">\n            <div id="remove">x</div>\n            <h1 id="name">' + input + '</h1>\n            <p>(' + input + ') Prices, Dividends, Splits and Trading Volume</p>\n          </div>';
};
function StockItem(template) {
  var name = template.find('#name').text();
  return Object.freeze({
    name: name,
    template: template,
    getIndex: function getIndex(arr) {
      var result = arr.map(function (stockItem, index) {
        return stockItem.name === name ? index : -1;
      }).filter(function (num) {
        return num !== -1;
      })[0];
      return result;
    }
  });
}

var _stockItemCollection = '<div id="stock-items"></div>';
function StockItemCollection(template, chart, onClickRemoveStockItem) {
  var items = [];
  var remove = function remove(getIndex) {
    var index = getIndex(items);
    chart.removeSeries(index);
    var div = items[index].template;
    div.removeClass("fadeInRight").addClass("fadeOutLeft");
    setTimeout(function () {
      div.remove();
    }, 500);
    items.splice(index, 1);
  };
  var add = function add(getInput) {
    var input = getInput();
    var $stockItem = (0, _core2.default)(_stockItem(input));
    var stockItem = StockItem($stockItem);
    var index = items.length;
    items.push(stockItem);
    onClickRemoveStockItem($stockItem, function (ev) {
      console.log('click remove!');
      socket.emit('remove stock', index);
    });
    template.append($stockItem);
  };

  return Object.freeze({
    add: add,
    remove: remove,
    getItems: function getItems() {
      return items;
    }
  });
}

var _stockAdd = '<div id="stock-add">\n      <div id="container">\n        <p id="description"><b>Syncs with other clients in realtime</b></p></br>\n        <input id="field" type="text" name="firstname">\n        <button id="add">Add</button>\n      </div>\n    </div>';
function StockItemInserter(template, onClickAddStockItem) {
  var add = function add() {
    socket.emit('request stock', template.find('#container #field').val().toUpperCase());
  };

  onClickAddStockItem(template, add);

  return Object.freeze({
    add: function add(input) {
      socket.emit('request stock', input.toUpperCase());
    }
  });
}

// Main
function _main() {

  // Templates => JQuery Elements
  var $chart = (0, _core2.default)(_stockChart);
  var $collection = (0, _core2.default)(_stockItemCollection);
  var $inserter = (0, _core2.default)(_stockAdd);

  // Render JQuery Elements to HTML Document
  (0, _core2.default)('ui-view').append($chart).append($collection).after($inserter);

  // Bind User Inputs to View Actions
  var onClickAddStockItem = function onClickAddStockItem($inserter, cb) {
    $inserter.find('#add').click(cb);
  };
  var onClickRemoveStockItem = function onClickRemoveStockItem($item, cb) {
    $item.find('#remove').click(cb);
  };

  // JQuery Elements => Modules containing View Actions
  var chart = StockChart($chart);
  var collection = StockItemCollection($collection, chart, onClickRemoveStockItem);
  var inserter = StockItemInserter($inserter, onClickAddStockItem);

  // Modify as needed
  var sendStock = function sendStock(res) {
    var stamped = res.data.map(function (_item) {
      var item = [_item.date, _item.open];
      var parts = item[0].split('-').map(function (i) {
        return parseInt(i);
      });
      var result = (parts[0] - 1970) * 31556952000 + parts[1] * 2629746000 + parts[2] * 86400000;
      return [result, item[1]];
    }).reverse();
    var upperName = res.name.toUpperCase();
    chart.addSeries(upperName, stamped);
    collection.add(function () {
      return upperName;
    });
  };

  socket.on('remove stock', function (index) {
    console.log('removing stock...');
    collection.remove(function () {
      return index;
    });
  });

  socket.on('send stock', sendStock);

  socket.on('send stocks', function (lists) {
    console.log('sending existing stocks...');
    if (collection.getItems().length > 0) {
      console.log('exiting send stock...');
      return;
    }
    if (lists.length > 0) lists.map(sendStock);else socket.emit('request stock', 'AAPL');
  });

  socket.emit('request stocks');
}

(0, _core2.default)(document).ready(_main);