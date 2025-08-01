import json
from datetime import date

from tradingagents.graph.trading_graph import TradingAgentsGraph


def run_tradingagents(symbol: str) -> str:
    graph = TradingAgentsGraph(debug=False)
    state, _ = graph.propagate(symbol, date.today())
    return json.dumps(
        {
            "symbol": symbol,
            "market_report": state.get("market_report"),
            "sentiment_report": state.get("sentiment_report"),
            "news_report": state.get("news_report"),
            "fundamentals_report": state.get("fundamentals_report"),
            "investment_plan": state.get("investment_plan"),
        }
    )


async def on_request(request, env):
    if request.method == "GET" and request.url.endswith("/research"):
        symbol = request.query.get("symbol")
        if not symbol:
            return Response("symbol required", status=400)
        report_json = run_tradingagents(symbol)
        return Response(report_json, headers={"Content-Type": "application/json"})
    return Response("Not found", status=404)
