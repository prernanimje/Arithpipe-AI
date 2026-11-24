from fastapi import APIRouter
import urllib.request
import json
import asyncio
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

COMPANY_NAMES = {
    "AAPL": "Apple Inc.",
    "TSLA": "Tesla Inc.",
    "GOOGL": "Alphabet Inc.",
    "MSFT": "Microsoft Corp.",
    "AMZN": "Amazon.com Inc.",
    "BTC-USD": "Bitcoin USD",
    "NVDA": "NVIDIA Corp.",
    "META": "Meta Platforms"
}

def fetch_stock_price(symbol: str):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }
    
    # Try query1, fallback to query2
    endpoints = [
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d",
        f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d"
    ]
    
    for url in endpoints:
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=4) as res:
                data = json.loads(res.read().decode('utf-8'))
                result = data.get("chart", {}).get("result", [])
                if result and len(result) > 0:
                    meta = result[0].get("meta", {})
                    price = meta.get("regularMarketPrice") or meta.get("chartPreviousClose") or 0.0
                    prev_close = meta.get("previousClose") or meta.get("chartPreviousClose") or price
                    change = price - prev_close
                    change_percent = (change / prev_close * 100) if prev_close else 0.0
                    
                    quote = result[0].get("indicators", {}).get("quote", [{}])[0]
                    close_prices = quote.get("close", [])
                    valid_prices = [round(float(p), 2) for p in close_prices[-15:] if p is not None]
                    if not valid_prices and price:
                        valid_prices = [round(float(price), 2)]
                    
                    company_name = meta.get("shortName") or COMPANY_NAMES.get(symbol, symbol)
                    
                    return {
                        "symbol": symbol,
                        "name": company_name,
                        "price": round(float(price), 2),
                        "change": round(float(change), 2),
                        "changePercent": round(float(change_percent), 2),
                        "data": valid_prices
                    }
        except Exception as e:
            continue
            
    print(f"Warning: Could not fetch real-time price for {symbol}")
    return None

@router.get("")
@router.get("/")
async def get_live_stocks(symbols: str = "AAPL,TSLA,GOOGL,MSFT,AMZN,BTC-USD"):
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    
    tasks = [
        run_in_threadpool(fetch_stock_price, sym)
        for sym in symbol_list
    ]
    results = await asyncio.gather(*tasks)
    
    successful = [r for r in results if r is not None]
    return successful
