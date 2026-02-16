# Implementation Plan - US Stock Chart Application

## Goal
* Fetch US stock data via API.
* Render interactive candlestick charts with Volume pane.
* Apply custom technical indicators:
    *   **Candle Analysis**: Visualizing trends via Heikin-Ashi or multi-timeframe logic (simulated via API).
    *   **Volume Analysis**: Color-coding volume bars based on price trend to validate moves (Price Up + Vol Up = Strong).
    *   **MA Convergence/Divergence**: Visualizing compression of 5, 20, 60, 120 MAs.
    *   **Perfect Order (Jeong-bae-yeol)**: Highlighting areas where 5 > 20 > 60 > 120 aligned.
    *   **Trading Strategy (Nul-lim-mok)**: Suggesting "Buy Now" or "Wait for Price X" based on pullback logic.

## Tech Stack
* React (Vite), Lightweight Charts, date-fns, CSS Modules.

## Proposed Changes
1. [NEW] src/services/api.js - Mock data generator.
2. [NEW] src/components/ChartComponent.jsx - Chart wrapper.
1. [MODIFY] src/services/api.js - Add Volume to mock data.
2. [MODIFY] src/utils/indicators.js - Add functions for Volume Trend Analysis & Perfect Order Detection & Strategy Logic.
3. [MODIFY] src/components/ChartComponent.jsx - Add Volume Series & Multi-MA Overlay (5, 20, 60, 120).
4. [MODIFY] src/components/SignalDisplay.jsx - Display "Action: BUY/WAIT", "Reason", and "Target Price".