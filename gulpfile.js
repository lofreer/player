var gulp         = require('gulp');
var babel        = require('gulp-babel');
var uglify       = require('gulp-uglify');
var connect      = require('gulp-connect');

gulp.task('connect', function() {
    connect.server({
        root: './',
        port: 8000,
        livereload: true
    });
});

gulp.task('build', function() {
    return gulp.src('./src/js/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        // .pipe(uglify())
        .pipe(gulp.dest('./dist/js'))
        .pipe(connect.reload());
});

gulp.task('watch', ['build', 'connect'], function() {
    gulp.watch('./src/js/*.js', ['build']);
});

gulp.task('default', ['watch']);