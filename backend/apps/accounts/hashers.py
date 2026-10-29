from django.contrib.auth.hashers import Argon2PasswordHasher


class FizikaArgon2Hasher(Argon2PasswordHasher):
    """Argon2id, OWASP tavsiyasi (m=19 MiB, t=2, p=1).
    Django standarti (m=100 MiB, p=8) kichik VPS'da bir sinf bir vaqtda kirganda xotira va
    protsessorni band qilib, kirishni bir necha soniyaga cho'zardi (yuklama testida aniqlangan)."""

    algorithm = "argon2"
    time_cost = 2
    memory_cost = 19456
    parallelism = 1
