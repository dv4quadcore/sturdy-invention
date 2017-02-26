

module.exports = {
    entry: './script.js',
    output: {
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            { test: /jquery[\\\/]src[\\\/]selector\.js$/, loader: 'amd-define-factory-patcher-loader' }
        ]
    }
};