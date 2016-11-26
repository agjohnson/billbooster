var gulp = require('gulp'),
    webpack = require('gulp-webpack'),
    //browserify = require('browserify'),
    //debowerify = require('debowerify'),
    jshint = require('gulp-jshint'),
    less = require('gulp-less'),
    bower_resolve = require('less-plugin-bower-resolve'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    named = require('vinyl-named'),
    util = require('gulp-util'),
    watch = require('gulp-watch'),
    run = require('gulp-run'),
    es = require('event-stream');

/* Tasks */
gulp.task('default', ['lint', 'build']);

gulp.task('lint', function () {
    return lint_js();
});

gulp.task('build', function () {
    return es.merge([
        build_js(),
        build_css(),
    ]);
});

gulp.task('dev', function (done) {
    util.log('Continually building source files');

    watch(['web/css/**/*'], {awaitWriteFinish: true}, function (file) {
        util.log('File changed:', file.path);
        build_css();
    });
    watch(['web/js/**/*'], {awaitWriteFinish: true}, function (file) {
        util.log('File changed:', file.path);
        build_js();
    });
});

/* Task functions */
function lint_js () {
    return gulp.src('web/js/*.js')
        .pipe(jshint({browserify: true, browser: true, devel: true}))
        .pipe(jshint.reporter('default'))
}

function build_js () {
    util.log('Building JavaScript files');

    return gulp.src('web/js/*.js')
        .pipe(named())
        .pipe(webpack({output: {library: '[name]'}}))
        .pipe(gulp.dest('static/js/'));
    /*
    var builder = browserify({
        entries: ['web/js/bill.js'],
        debug: true,
        transform: [
            debowerify
        ]
    });

    return builder.bundle()
        .pipe(source('web/js/bill.js'))
        .pipe(buffer())
        .pipe(gulp.dest('static/'));
    */
}

function build_css () {
    util.log('Building CSS stylesheets');

    return es.merge(
        gulp.src('web/css/theme.less', {base: 'web'})
            .pipe(less({
                lint: true,
                plugins: [bower_resolve]
            }))
            .on('error', function (ev) {
                util.beep();
                util.log('LESS error:', ev.message);
            })
            .pipe(gulp.dest('static/'))
    )
        /*
        gulp.src('bower_components/notosans-fontface/fonts/*.{ttf,woff,woff2}')
            .pipe(gulp.dest('apitheme/static/font/')),
        gulp.src('bower_components/font-awesome/fonts/*-webfont.*')
            .pipe(gulp.dest('apitheme/static/font/'))
        */
}
