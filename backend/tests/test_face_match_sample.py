import csv
import unittest
from pathlib import Path

THRESHOLD = 0.50
SAMPLE = Path(__file__).parent / "fixtures" / "face_match_sample.csv"


class SampleFaceMatchTest(unittest.TestCase):
    def test_synthetic_sample_metrics(self):
        with SAMPLE.open(newline="") as file:
            rows = [row for row in csv.DictReader(line for line in file if not line.startswith("#"))]

        actual = [row["label"] == "match" for row in rows]
        predicted = [float(row["similarity"]) >= THRESHOLD for row in rows]
        correct = sum(a == p for a, p in zip(actual, predicted))

        self.assertEqual(len(rows), 8)
        self.assertEqual(correct / len(rows), 1.0)


if __name__ == "__main__":
    unittest.main()
