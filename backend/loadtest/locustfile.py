"""
Yuklama testi (TZ 14.4, NF-1/NF-2): o'quvchilar bir vaqtda kiradi, model jurnalini saqlaydi va test topshiradi.

Tayyorlash (sinov bazasida!):
    python manage.py create_load_users --count 500
Backend (alohida terminalda; IP cheklovlari o'chirilgan maxsus sozlama):
    DJANGO_SETTINGS_MODULE=config.settings.loadtest gunicorn config.wsgi -w 4 -b 127.0.0.1:8000
Ishga tushirish (alohida muhitda: pip install locust):
    locust -f loadtest/locustfile.py --host http://127.0.0.1:8000 -u 500 -r 50 -t 3m --headless
Mezon: 95% so'rovlar ≤ 300 ms, xatolar < 0,5%.
"""
import random
import uuid

from locust import HttpUser, between, task

PASSWORD = "Yuklama-2026!"


class Student(HttpUser):
    wait_time = between(1, 4)

    def on_start(self):
        n = random.randint(1, int(self.environment.parsed_options.num_users or 50))
        r = self.client.post("/api/v1/auth/login/", json={"login": f"yuklama{n}", "password": PASSWORD},
                             name="auth/login")
        self.token = r.json().get("access") if r.ok else None
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.client_id = str(uuid.uuid4())
        self.rows = []

    @task(5)
    def catalog(self):
        self.client.get("/api/v1/simulations/", name="simulations")

    @task(3)
    def save_lab(self):
        L = round(random.uniform(0.3, 2.5), 2)
        self.rows = (self.rows + [[L, 10, 9.81, round(2.006 * L ** 0.5, 3), 5, 9.8, 0.1]])[-10:]
        self.client.post("/api/v1/labs/", headers=self.headers, name="labs/save",
                         json={"client_id": self.client_id, "simulation": "mayatnik", "rows": self.rows})

    @task(1)
    def take_test(self):
        r = self.client.post("/api/v1/quiz/attempts/", headers=self.headers, name="quiz/start",
                             json={"topics": ["kepler", "linza"], "count": 10, "problems": 1})
        if not r.ok:
            return
        a = r.json()
        for it in a["items"]:
            ans = str(random.randint(0, 3)) if it["type"] == "mcq" else "1,5"
            self.client.post(f"/api/v1/quiz/attempts/{a['id']}/answer/", headers=self.headers,
                             json={"item_id": it["item_id"], "answer": ans}, name="quiz/answer")
        self.client.post(f"/api/v1/quiz/attempts/{a['id']}/finish/", headers=self.headers, name="quiz/finish")

    @task(2)
    def my_tasks(self):
        self.client.get("/api/v1/assignments/", headers=self.headers, name="assignments")
