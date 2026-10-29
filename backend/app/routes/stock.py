from fastapi import APIRouter
import urllib.request
import json
import asyncio
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

def fetch_stock_price(symbol: str):
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    try:
        res = urllib.request.urlopen(req, timeout=5)
        data = json.loads(res.read().decode('utf-8'))
        result = data.get("chart", {}).get("result", [])
        if result and len(result) > 0:
            meta = result[0].get("meta", {})
            price = meta.get("regularMarketPrice", 0)
            prev_close = meta.get("previousClose", 0)
            change = price - prev_close
            change_percent = (change / prev_close * 100) if prev_close else 0
            
            # extract some chart data
            quote = result[0].get("indicators", {}).get("quote", [{}])[0]
            close_prices = quote.get("close", [])
            valid_prices = [p for p in close_prices[-10:] if p is not None]
            
            return {
                "symbol": symbol,
                "price": price,
                "change": change,
                "changePercent": change_percent,
                "data": valid_prices
            }
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
    return None

@router.get("/")
async def get_live_stocks(symbols: str = "AAPL,TSLA,GOOGL,MSFT,AMZN,BTC-USD"):
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    
    # Run in threadpool to avoid blocking event loop
    loop = asyncio.get_event_loop()
    tasks = [
        run_in_threadpool(fetch_stock_price, sym)
        for sym in symbol_list
    ]
    results = await asyncio.gather(*tasks)
    
    successful = [r for r in results if r is not None]
    return successful
