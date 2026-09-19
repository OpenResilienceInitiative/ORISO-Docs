#!/usr/bin/env python3
"""Tests for the privacy boundary in ua_publish_graphs.

The channel is a public release. Getting this filter wrong publishes the
structure of a private repository, and a release asset cannot be unpublished
from anyone who already fetched it. So the decision is tested directly rather
than trusted to review.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ua_publish_graphs as publisher  # noqa: E402


def generation(tmp, sources, graphs):
    """Lay out a minimal generation: a manifest plus one dir per graph."""
    with open(os.path.join(tmp, "manifest.json"), "w", encoding="utf-8") as handle:
        json.dump({"sources": [{"repository": name} for name in sources]}, handle)
    for name in graphs:
        path = os.path.join(tmp, name, ".understand-anything")
        os.makedirs(path)
        with open(os.path.join(path, "knowledge-graph.json"), "w") as handle:
            handle.write("{}")
    return tmp


class PublishBoundary(unittest.TestCase):
    def decide(self, sources, graphs, public):
        with tempfile.TemporaryDirectory() as tmp:
            generation(tmp, sources, graphs)
            with mock.patch.object(
                publisher, "public_repositories", return_value=set(public)
            ):
                return publisher.publishable(tmp, "OpenResilienceInitiative", "t")

    def test_all_public_publishes_everything_including_aggregates(self):
        allowed, withheld, private = self.decide(
            sources=["ORISO-Frontend", "ORISO-Helm"],
            graphs=["ORISO-Frontend", "ORISO-Helm", "ORISO-Supergraph", "ORISO-Platform"],
            public=["ORISO-Frontend", "ORISO-Helm"],
        )
        self.assertEqual(withheld, [])
        self.assertEqual(private, [])
        self.assertIn("ORISO-Supergraph", allowed)
        self.assertIn("ORISO-Platform", allowed)

    def test_private_input_withholds_that_graph(self):
        allowed, withheld, private = self.decide(
            sources=["ORISO-Frontend", "ORISO-Infra"],
            graphs=["ORISO-Frontend", "ORISO-Infra"],
            public=["ORISO-Frontend"],
        )
        self.assertEqual(allowed, ["ORISO-Frontend"])
        self.assertEqual(withheld, ["ORISO-Infra"])
        self.assertEqual(private, ["ORISO-Infra"])

    def test_private_input_also_withholds_the_aggregates(self):
        """The supergraph merges every input, so one private source taints it."""
        allowed, withheld, _ = self.decide(
            sources=["ORISO-Frontend", "ORISO-Infra"],
            graphs=["ORISO-Frontend", "ORISO-Infra", "ORISO-Supergraph", "ORISO-Platform"],
            public=["ORISO-Frontend"],
        )
        self.assertEqual(allowed, ["ORISO-Frontend"])
        self.assertIn("ORISO-Supergraph", withheld)
        self.assertIn("ORISO-Platform", withheld)

    def test_unproven_visibility_is_treated_as_private(self):
        """A failed lookup must not read as public."""
        allowed, withheld, _ = self.decide(
            sources=["ORISO-Frontend", "ORISO-Helm"],
            graphs=["ORISO-Frontend", "ORISO-Helm", "ORISO-Supergraph"],
            public=["ORISO-Frontend"],  # Helm's lookup "failed"
        )
        self.assertEqual(allowed, ["ORISO-Frontend"])
        self.assertIn("ORISO-Helm", withheld)
        self.assertIn("ORISO-Supergraph", withheld)

    def test_missing_manifest_refuses(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(SystemExit):
                publisher.publishable(tmp, "OpenResilienceInitiative", "t")

    def test_manifest_without_sources_refuses(self):
        with tempfile.TemporaryDirectory() as tmp:
            generation(tmp, [], ["ORISO-Frontend"])
            with self.assertRaises(SystemExit):
                publisher.publishable(tmp, "OpenResilienceInitiative", "t")


class VisibilityLookup(unittest.TestCase):
    def test_only_explicitly_public_counts(self):
        answers = {
            "ORISO-Frontend": {"private": False, "visibility": "public"},
            "ORISO-Infra": {"private": True, "visibility": "private"},
            # An internal repo is not world readable, and the release is.
            "ORISO-Secret": {"private": False, "visibility": "internal"},
        }
        with mock.patch.object(
            publisher, "request", side_effect=lambda m, url, t: answers[url.split("/")[-1]]
        ):
            public = publisher.public_repositories(
                "OpenResilienceInitiative", list(answers), "t"
            )
        self.assertEqual(public, {"ORISO-Frontend"})


if __name__ == "__main__":
    unittest.main(verbosity=2)
