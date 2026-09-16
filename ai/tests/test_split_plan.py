"""Adversarial inputs should fail before training."""
import pytest
from ai.src.dataset.schema import validate_dataset
from ai.src.dataset.features import select_feature_columns
from ai.src.config.schema import FeatureConfig


def test_unknown_candidate_label_column_rejected(candidates):
    candidates['candidate_utility']=candidates.utility
    assert 'candidate_utility' not in select_feature_columns(candidates,FeatureConfig())
    with pytest.raises(ValueError,match='label leakage'):
        validate_dataset(candidates)
