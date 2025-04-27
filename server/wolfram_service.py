import os
import requests

def query_wolfram(question):
    app_id = os.getenv('WOLFRAM_API_KEY')
    endpoint = 'https://api.wolframalpha.com/v1/result'
    params = {
        'i': question,
        'appid': app_id
    }
    response = requests.get(endpoint, params=params)

    if response.status_code == 200:
        return response.text
    else:
        return "Sorry, Wolfram couldn't compute that."
