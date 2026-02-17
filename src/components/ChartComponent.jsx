import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { calculateSMA } from '../utils/indicators';

const ChartComponent = ({ data, standardBar, strategy, onSignalClick, lang, referenceLines }) => {
    const chartContainerRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: {
                background: { color: '#222' },
                textColor: '#DDD',
            },
            grid: {
                vertLines: { color: '#444' },
                horzLines: { color: '#444' },
            },
            crosshair: {
                mode: 0, // Normal mode
            },
            rightPriceScale: {
                borderColor: '#444',
            },
            timeScale: {
                borderColor: '#444',
                timeVisible: true, // Show seconds/minutes for intraday
                secondsVisible: false,
            },
            handleScroll: true,
            handleScale: true,
        });

        chartContainerRef.current.style.cursor = 'crosshair';

        // 1. Candlestick Series
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        candlestickSeries.setData(data);

        // 2. Volume Series (Histogram)
        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        const volumeData = data.map((item, index) => {
            const color = index > 0 && item.close < data[index - 1].close ? '#ef5350' : '#26a69a';
            return { time: item.time, value: item.volume, color };
        });
        volumeSeries.setData(volumeData);


        // 3. Moving Averages
        const prices = data.map(d => d.close);
        const sma5 = calculateSMA(prices, 5);
        const sma20 = calculateSMA(prices, 20);
        const sma60 = calculateSMA(prices, 60);
        const sma120 = calculateSMA(prices, 120);

        const addSAMLine = (smaData, color, width = 1) => {
            const lineSeries = chart.addLineSeries({ color, lineWidth: width });
            const lineData = data.map((d, i) => ({ time: d.time, value: smaData[i] })).filter(d => !isNaN(d.value));
            lineSeries.setData(lineData);
        };

        addSAMLine(sma5, '#FF5252', 1);   // 5-day (Red)
        addSAMLine(sma20, '#FFEB3B', 2);  // 20-day (Yellow)
        addSAMLine(sma60, '#4CAF50', 2);  // 60-day (Green)
        addSAMLine(sma120, '#2196F3', 3); // 120-day (Blue)

        // 4. Waistline for Standard Bar
        if (standardBar) {
            const waistlineSeries = chart.addLineSeries({
                color: '#E040FB',
                lineWidth: 2,
                lineStyle: 1,
            });

            const waistData = [];
            let startIndex = -1;
            for (let i = 0; i < data.length; i++) {
                if (data[i].time === standardBar.time) {
                    startIndex = i;
                    break;
                }
            }

            if (startIndex !== -1) {
                for (let i = startIndex; i < data.length; i++) {
                    waistData.push({ time: data[i].time, value: standardBar.waistline });
                }
                waistlineSeries.setData(waistData);
            }
        }

        // 4b. Reference Lines (기준가/세력가 수평선)
        if (referenceLines && referenceLines.length > 0) {
            referenceLines.forEach((line, idx) => {
                const refLineSeries = chart.addLineSeries({
                    color: line.type === 'support' ? 'rgba(0, 230, 230, 0.5)' : 'rgba(255, 165, 0, 0.5)',
                    lineWidth: 1,
                    lineStyle: 2, // Dashed 
                    crosshairMarkerVisible: false,
                });
                // Draw from beginning to end of data
                const refLineData = data.map(d => ({ time: d.time, value: line.price }));
                refLineSeries.setData(refLineData);
            });
        }

        // 5. Historical Markers (Buy/Sell)
        if (strategy && strategy.allSignals && strategy.allSignals.length > 0) {
            const localizedMarkers = strategy.allSignals.map(s => ({
                ...s,
                text: typeof s.text === 'string' ? s.text : s.text[lang]
            }));
            candlestickSeries.setMarkers(localizedMarkers);
        }

        // 6. Click Handler for Signals
        chart.subscribeClick((param) => {
            if (param.time && strategy && strategy.allSignals) {
                // Find if there is a signal at this time
                const signalAtTime = strategy.allSignals.find(s => s.time === param.time);
                if (signalAtTime && onSignalClick) {
                    onSignalClick(signalAtTime);
                }
            }
        });

        // 7. Hover Effect for Signals
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !strategy || !strategy.allSignals) {
                chartContainerRef.current.style.cursor = 'crosshair';
                return;
            }
            const hasSignal = strategy.allSignals.some(s => s.time === param.time);
            chartContainerRef.current.style.cursor = hasSignal ? 'pointer' : 'crosshair';
        });

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, standardBar, strategy, lang, referenceLines]);

    return (
        <div style={{ position: 'relative' }}>
            {/* Chart Legend (Color Guide) */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                padding: '12px 15px',
                background: '#1a1a1a',
                borderRadius: '10px',
                border: '1px solid #333',
                marginBottom: '15px',
                fontSize: '0.85em',
                color: '#ddd',
                alignItems: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: '#FF5252', borderRadius: '2px' }}></div>
                    <span>{lang === 'ko' ? '5일선' : '5MA'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: '#FFEB3B', borderRadius: '2px' }}></div>
                    <span>{lang === 'ko' ? '20일선' : '20MA'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: '#4CAF50', borderRadius: '2px' }}></div>
                    <span>{lang === 'ko' ? '60일선' : '60MA'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: '#2196F3', borderRadius: '2px' }}></div>
                    <span>{lang === 'ko' ? '120일선' : '120MA'}</span>
                </div>
                <div style={{ width: '1px', height: '15px', background: '#444', margin: '0 5px' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '2px', borderBottom: '2px dashed #E040FB' }}></div>
                    <span>{lang === 'ko' ? '허리라인' : 'Waistline'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: 'rgba(0, 230, 230, 0.6)', borderRadius: '2px' }}></div>
                    <span>{lang === 'ko' ? '기관 지지선' : 'Inst. Support'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: 'rgba(255, 165, 0, 0.6)', borderRadius: '2px' }}></div>
                    <span>{lang === 'ko' ? '기관 저항선' : 'Inst. Resistance'}</span>
                </div>
            </div>

            <div ref={chartContainerRef} style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }} />
        </div>
    );
};

export default ChartComponent;
