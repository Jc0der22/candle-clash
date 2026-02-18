import { useEffect, useRef, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import type { Candle } from '../types';

interface ChartProps {
  candles: Candle[];
  currentIndex: number;
  height?: number;
}

export function Chart({ candles, currentIndex, height = 300 }: ChartProps) {
  const webViewRef = useRef<WebView | null>(null);

  const injectChartData = useCallback(() => {
    const visibleCandles = candles.slice(0, currentIndex + 1);
    if (visibleCandles.length === 0) return;

    const script = `
      (function() {
        try {
          var candles = ${JSON.stringify(visibleCandles)};
          if (typeof window.updateChart === 'function') {
            window.updateChart(candles, ${currentIndex});
          }
        } catch (e) {
          console.error('Chart inject error:', e);
        }
      })();
      true;
    `;

    webViewRef.current?.injectJavaScript(script);
  }, [candles, currentIndex]);

  useEffect(() => {
    injectChartData();
  }, [injectChartData]);

  return (
    <WebView
      ref={(ref) => { webViewRef.current = ref; }}
      source={require('../assets/chart/chart.html')}
      style={{ height, width: '100%', backgroundColor: '#0A0A0A' }}
      scrollEnabled={false}
      bounces={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      mixedContentMode="compatibility"
      allowsInlineMediaPlayback={true}
      onLoadEnd={injectChartData}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error:', nativeEvent);
      }}
      onHttpError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView HTTP error:', nativeEvent.statusCode);
      }}
    />
  );
}
