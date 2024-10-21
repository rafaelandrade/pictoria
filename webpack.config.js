const path = require('path');
const Dotenv = require('dotenv-webpack');


module.exports = {
    mode: 'production',
    entry: './src/main.ts', // Adjust this to your entry TypeScript file
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'build'),
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new Dotenv()
    ]
};