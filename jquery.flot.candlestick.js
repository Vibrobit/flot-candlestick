/*
* The MIT License

Copyright (c) 2010, 2011, 2012 by Juergen Marsch

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
/*
Flot plugin for Candlestick data sets

series: {
candlestick: { active: false,
show: false,
barHeight: 2
}
}
data: [

$.plot($("#placeholder"), [{ data: [ ... ], candlestick:{show: true} }])

plugin was customized/rewritten by Nick Serebrennikov https://github.com/nonmanifold to support oopen-high-low-close series
*/
(function ($) {
    'use strict';
    var options = {
        series: {
            candlestick: {
                rangeWidth: 4,
                rangeColor: "rgb(255,255,255)",
                ohlcBarWidth: 0.5, // width of OHLC bar relative to interval width
                avgThicknessMul: 3.0, // line width  multipilier for average value marker
                bodyWidth: "80%"
            }
        }
    };
    function init(aPlot) {
        aPlot.hooks.processOptions.push(processOptions);
        var opts = null;
        var bboxes = [];

        function processOptions(plot, options) {
            opts = options.series.candlestick;
            plot.hooks.drawBackground.push(preDraw);
            plot.hooks.drawSeries.push(drawSeries);

            aPlot.getBBoxes = function () {
                return bboxes;
            };
        }

        function preDraw() {
            bboxes = []; //clear bbox cache before drawing and thus storing resulting bboxes
        }

        function drawSeries(plot, ctx, series) {
            if (series.type !== 'candle' && series.type !== 'ohlc') {
                return;
            } else {
                series.lines.show = false;
                series.bars.show = false;
                series.points.show = false;
            }
            var axes = { xaxis: series.xaxis, yaxis: series.yaxis };
            var offset = plot.getPlotOffset();

            var color = series.color;
            ctx.save();
            ctx.translate(offset.left, offset.top);
            ctx.rect(0, 0, axes.xaxis.p2c(axes.xaxis.max), axes.yaxis.p2c(axes.yaxis.min));
            ctx.clip();
            var lineWidth = series.lines.lineWidth;

            for (var i = 0; i < series.data.length; i++) {
                drawDataPoint(ctx, series.data[i], series.label, color, axes, series.type, lineWidth);
            }
            ctx.restore();
        }

        function drawDataPoint(ctx, dataPoint, tag, color, axes, type, lineWidth) {
            var d = {
                x: dataPoint[0],
                avg: dataPoint[1],
                open: dataPoint[2],
                close: dataPoint[3],
                high: dataPoint[4],
                low: dataPoint[5],
                x1: dataPoint[6],
                tag: tag
            };
            var bbox = getBBox(d, axes);
            if (type == 'candle') {
                drawDataRange(ctx, d, color, axes, lineWidth, bbox);
                drawDataBody(ctx, d, color, axes, lineWidth, bbox);
            } else {
                drawDataRangeAsOHLC(ctx, d, color, axes, lineWidth, bbox);
            }
            storeDataBBox(d, bbox);
        }

        function storeDataBBox(d, bbox) {
            bboxes.push({ bbox: bbox, d: d });
        }

        function getBBox(d, axes) {
            var x = axes.xaxis.p2c(d.x);
            var x1 = axes.xaxis.p2c(d.x1);
            var x0 = x;
            var x01 = x1;
            var width = (x1 - x) * opts.ohlcBarWidth;
            var xMid = x + (x1 - x) / 2.0;
            // widen marker to make it visible
            x = xMid - width / 2.0;
            x1 = xMid + width / 2.0;

            var minWidth = opts.rangeWidth;
            if (xMid - x < minWidth / 2) {
                x = xMid - minWidth / 2;
            }
            if (x1 - xMid < minWidth / 2) {
                x1 = xMid + minWidth / 2;
            }

            var yOpen = axes.yaxis.p2c(d.open);
            var yClose = axes.yaxis.p2c(d.close);
            var yLow = axes.yaxis.p2c(d.low);
            var yHigh = axes.yaxis.p2c(d.high);
            var bbox = {
                // bar scaled
                x: x,
                x1: x1,
                //full range
                x0: x0,
                x01: x01,
                xMid: xMid,
                yOpen: yOpen,
                yClose: yClose,
                yLow: yLow,
                yHigh: yHigh
            };
            return bbox;
        }
        function drawDataRangeAsOHLC(ctx, d, color, axes, lineWidth, bbox) {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = color;

            ctx.beginPath();
            ctx.moveTo(bbox.xMid, bbox.yLow);
            ctx.lineTo(bbox.xMid, bbox.yHigh);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(bbox.x, bbox.yOpen);
            ctx.lineTo(bbox.xMid, bbox.yOpen);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(bbox.xMid, bbox.yClose);
            ctx.lineTo(bbox.x1, bbox.yClose);
            ctx.stroke();

            var yAvg = axes.yaxis.p2c(d.avg);
            ctx.beginPath();
            ctx.lineWidth = lineWidth * opts.avgThicknessMul;
            ctx.moveTo(bbox.x, yAvg);
            ctx.lineTo(bbox.x1, yAvg);
            ctx.stroke();

        }

        function drawDataRange(ctx, d, color, axes, lineWidth, bbox) {
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.moveTo(bbox.xMid, bbox.yLow);
            ctx.lineTo(bbox.xMid, bbox.yHigh);
            ctx.stroke();
        }

        function drawDataBody(ctx, d, color, axes, lineWidth, bbox) {
            var width = (bbox.x1 - bbox.x) * lineWidth * 0.2;

            if (d.open < d.close) {
                color = opts.rangeColor; //white, hole
            }
            if (d.open == d.close) {
                color = opts.rangeColor; //white, non-transparent
                bbox.yClose = bbox.yOpen + 1;
            }
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.moveTo(bbox.xMid, bbox.yOpen);
            ctx.lineTo(bbox.xMid, bbox.yClose);
            ctx.stroke();
        }

    }
    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'candlestick',
        version: '0.2'
    });
})(jQuery);
