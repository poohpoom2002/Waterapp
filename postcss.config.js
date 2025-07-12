export default {
    plugins: {
        'tailwindcss/nesting': {},
        tailwindcss: {},
        autoprefixer: {
            overrideBrowserslist: [
                '> 1%',
                'last 2 versions',
                'not dead',
                'not ie 11'
            ]
        },
    },
}; 