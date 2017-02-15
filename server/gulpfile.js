const gulp = require('gulp');
const install = require('gulp-install');

gulp.task('install-all', function() {
    gulp.src("./package.json", "./apps/**/package.json", "./apps/**/modules/**/package.json")
        .pipe(install());
});

gulp.task("watch", function() {
    gulp.watch(["./package.json", "./apps/**/package.json", "./apps/**/modules/**/package.json"], ["install-all"]);
})