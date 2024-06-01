import gulp from 'gulp';
import fileinclude from 'gulp-file-include';
import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import rename from 'gulp-rename';
import autoprefixer from 'gulp-autoprefixer';
import webpack from 'webpack-stream';
import ttf2woff2 from 'gulp-ttf2woff2';
import fonter from 'gulp-fonter';
import newer from 'gulp-newer';
import webp from 'gulp-webp';
import imagemin from 'gulp-imagemin';
import webphtml from 'gulp-webp-html-nosvg';
import webpcss from 'gulp-webp-css';
import browsersync from 'browser-sync';
import cleancss from 'gulp-clean-css';
import gulpif from 'gulp-if';
import sourcemaps from 'gulp-sourcemaps';
import { deleteAsync } from 'del';

let isProd = false;

const path = {
    dev: {
        root: 'dev/',
        css: 'dev/css',
        js: 'dev/js',
        fonts: 'dev/fonts',
        img: 'dev/img',
    },
    prod: {
        root: 'prod/',
        css: 'prod/css',
        js: 'prod/js',
        fonts: 'prod/fonts',
        img: 'prod/img',
    }
}

const html = () => {
    return gulp.src(['src/html/**/*.html', '!src/html/components/**'])
        .pipe(fileinclude())
        .pipe(gulpif(isProd, webphtml()))
        .pipe(gulp.dest(isProd ? path.prod.root : path.dev.root))
        .pipe(browsersync.stream());
}

const sass = gulpSass(dartSass);

const styles = () => {
    return gulp.src('src/scss/styles.scss')
        .pipe(gulpif(!isProd, sourcemaps.init()))
        .pipe(sass({ outputStyle: isProd ? 'compressed' : 'expanded' }))
        .pipe(gulpif(isProd, webpcss()))
        .pipe(gulpif(isProd, autoprefixer({ overrideBrowserslist: ['last 10 versions'] })))
        .pipe(gulpif(isProd, cleancss()))
        .pipe(gulpif(!isProd, sourcemaps.write()))
        .pipe(rename({ extname: '.min.css' }))
        .pipe(gulp.dest(isProd ? path.prod.css : path.dev.css))
        .pipe(browsersync.stream());
}

const scripts = () => {
    return gulp.src('src/js/main.js')
        .pipe(webpack({
            mode: isProd ? 'production' : 'development',
            output: {
                filename: 'main.min.js',
                environment: {
                    arrowFunction: false,
                },
            },
            module: isProd ? {
                rules: [
                    {
                        test: /\.(?:js|mjs|cjs)$/,
                        exclude: /node_modules/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    ['@babel/preset-env', { targets: "ie 11" }]
                                    // ['@babel/preset-env', { targets: "defaults" }]
                                ]
                            }
                        }
                    }
                ]
            } : {},
            devtool: isProd ? false : 'source-map',
        }))
        .pipe(gulp.dest(isProd ? path.prod.js : path.dev.js))
        .pipe(browsersync.stream());
}

const convert_fonts = () => {
    return gulp.src('src/fonts/convert_fonts/*.*')
        .pipe(fonter({
            // formats: ['woff', 'eot']
            formats: ['woff']
        }))
        .pipe(gulp.dest('src/fonts'))
        .pipe(gulp.src('src/fonts/convert_fonts/*.ttf'))
        .pipe(ttf2woff2())
        .pipe(gulp.dest('src/fonts'));
}

const fonts = () => {
    return gulp.src(['src/fonts/*.*'])
        .pipe(newer(isProd ? path.prod.fonts : path.dev.fonts))
        .pipe(gulp.dest(isProd ? path.prod.fonts : path.dev.fonts))
        .pipe(browsersync.stream());
}

const convert_images = () => {
    return gulp.src(['src/img/convert_images/*.*', '!src/img/convert_images/*.svg'])
        .pipe(newer('src/img'))
        .pipe(webp())
        .pipe(gulp.src('src/img/convert_images/*.*'))
        .pipe(newer('src/img'))
        .pipe(imagemin())
        .pipe(gulp.dest('src/img'));
}

const images = () => {
    return gulp.src('src/img/*.*')
        .pipe(newer(isProd ? path.prod.img : path.dev.img))
        .pipe(gulp.dest(isProd ? path.prod.img : path.dev.img))
        .pipe(browsersync.stream());
}

const server = () => {
    return browsersync.init({
        server: {
            baseDir: isProd ? path.prod.root : path.dev.root
        }
    });
}

const clean = () => {
    return deleteAsync(isProd ? path.prod.root : path.dev.root);
}

const watch = () => {
    gulp.watch('src/html/**/*.html', html);
    gulp.watch('src/scss/**/*.scss', styles);
    gulp.watch('src/js/**/*.js', scripts);
    gulp.watch('src/img/*.*', images);
    gulp.watch('src/img/convert_images/*.*', convert_images);
    gulp.watch('src/fonts/*.*', fonts);
    gulp.watch('src/fonts/convert_fonts/*.ttf', convert_fonts);
}

const toProd = (done) => {
    isProd = true;
    done();
}


const prod = gulp.series(toProd, clean, convert_images, convert_fonts, html, styles, scripts, images, fonts, server);

const dev = gulp.parallel(gulp.series(clean, convert_images, convert_fonts, html, styles, scripts, images, fonts, server), watch);

export { prod };
export default dev;