var gulp         = require('gulp');
var babel        = require('gulp-babel');
var autoprefixer = require('gulp-autoprefixer');
var uglify       = require('gulp-uglify');
var connect      = require('gulp-connect');

gulp.task('connect', function() {
    connect.server({
        root: './',
        port: 8000,
        livereload: true
    });
});

gulp.task('styles', function() {
    return gulp.src('src/css/*.css')
        .pipe(autoprefixer({
            browsers: ['last 5 versions', 'Android >= 4.0'],
            cascade: true, 
            remove:true 
        }))
        .pipe(gulp.dest('dist/css'))
        .pipe(connect.reload());
});

gulp.task('scripts', function() {
    return gulp.src('src/js/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        // .pipe(uglify())
        .pipe(gulp.dest('dist/js'))
        .pipe(connect.reload());
});

gulp.task('watch', ['styles', 'scripts', 'connect'], function() {
    gulp.watch('./src/js/*.js', ['scripts']);
    gulp.watch('./src/css/*.css', ['styles']);
});

gulp.task('default', ['watch']);