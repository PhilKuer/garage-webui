package router

import (
	"context"
	"encoding/json"
	"fmt"
	"khairul169/garage-webui/utils"
	"net/http"
	"strconv"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go"
)

type Lifecycle struct{}

type LifecycleRule struct {
	ID                             string `json:"id"`
	Enabled                        bool   `json:"enabled"`
	Prefix                         string `json:"prefix"`
	ExpirationDays                 *int32 `json:"expirationDays,omitempty"`
	ExpirationDate                 string `json:"expirationDate,omitempty"`
	AbortIncompleteMultipartDays   *int32 `json:"abortIncompleteMultipartDays,omitempty"`
}

type LifecycleConfig struct {
	Rules []LifecycleRule `json:"rules"`
}

func (l *Lifecycle) GetLifecycle(w http.ResponseWriter, r *http.Request) {
	bucket := r.PathValue("bucket")

	client, err := getS3Client(bucket)
	if err != nil {
		utils.ResponseError(w, fmt.Errorf("cannot get S3 client: %w", err))
		return
	}

	result, err := client.GetBucketLifecycleConfiguration(context.Background(), &s3.GetBucketLifecycleConfigurationInput{
		Bucket: aws.String(bucket),
	})

	if err != nil {
		// NoSuchLifecycleConfiguration means no rules set — return empty
		var apiErr smithy.APIError
		if ok := isAPIError(err, &apiErr); ok && apiErr.ErrorCode() == "NoSuchLifecycleConfiguration" {
			utils.ResponseSuccess(w, LifecycleConfig{Rules: []LifecycleRule{}})
			return
		}
		utils.ResponseError(w, fmt.Errorf("cannot get lifecycle: %w", err))
		return
	}

	rules := make([]LifecycleRule, 0, len(result.Rules))
	for _, rule := range result.Rules {
		lr := LifecycleRule{
			ID:      aws.ToString(rule.ID),
			Enabled: rule.Status == types.ExpirationStatusEnabled,
		}

		if rule.Filter != nil {
			switch v := rule.Filter.(type) {
			case *types.LifecycleRuleFilterMemberPrefix:
				lr.Prefix = v.Value
			}
		}

		if rule.Expiration != nil {
			if rule.Expiration.Days != nil {
				days := int32(*rule.Expiration.Days)
				lr.ExpirationDays = &days
			}
			if rule.Expiration.Date != nil {
				lr.ExpirationDate = rule.Expiration.Date.Format("2006-01-02")
			}
		}

		if rule.AbortIncompleteMultipartUpload != nil && rule.AbortIncompleteMultipartUpload.DaysAfterInitiation != nil {
			days := int32(*rule.AbortIncompleteMultipartUpload.DaysAfterInitiation)
			lr.AbortIncompleteMultipartDays = &days
		}

		rules = append(rules, lr)
	}

	utils.ResponseSuccess(w, LifecycleConfig{Rules: rules})
}

func (l *Lifecycle) PutLifecycle(w http.ResponseWriter, r *http.Request) {
	bucket := r.PathValue("bucket")

	var body LifecycleConfig
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.ResponseError(w, err)
		return
	}

	client, err := getS3Client(bucket)
	if err != nil {
		utils.ResponseError(w, fmt.Errorf("cannot get S3 client: %w", err))
		return
	}

	// If no rules, delete the lifecycle configuration
	if len(body.Rules) == 0 {
		_, err := client.DeleteBucketLifecycle(context.Background(), &s3.DeleteBucketLifecycleInput{
			Bucket: aws.String(bucket),
		})
		if err != nil {
			var apiErr smithy.APIError
			if ok := isAPIError(err, &apiErr); ok && apiErr.ErrorCode() == "NoSuchLifecycleConfiguration" {
				utils.ResponseSuccess(w, map[string]bool{"ok": true})
				return
			}
			utils.ResponseError(w, fmt.Errorf("cannot delete lifecycle: %w", err))
			return
		}
		utils.ResponseSuccess(w, map[string]bool{"ok": true})
		return
	}

	rules := make([]types.LifecycleRule, 0, len(body.Rules))
	for i, rule := range body.Rules {
		status := types.ExpirationStatusDisabled
		if rule.Enabled {
			status = types.ExpirationStatusEnabled
		}

		id := rule.ID
		if id == "" {
			id = "rule-" + strconv.Itoa(i+1)
		}

		lr := types.LifecycleRule{
			ID:     aws.String(id),
			Status: status,
			Filter: &types.LifecycleRuleFilterMemberPrefix{Value: rule.Prefix},
		}

		if rule.ExpirationDays != nil && *rule.ExpirationDays > 0 {
			days := int32(*rule.ExpirationDays)
			lr.Expiration = &types.LifecycleExpiration{
				Days: &days,
			}
		}

		if rule.AbortIncompleteMultipartDays != nil && *rule.AbortIncompleteMultipartDays > 0 {
			days := int32(*rule.AbortIncompleteMultipartDays)
			lr.AbortIncompleteMultipartUpload = &types.AbortIncompleteMultipartUpload{
				DaysAfterInitiation: &days,
			}
		}

		rules = append(rules, lr)
	}

	_, err = client.PutBucketLifecycleConfiguration(context.Background(), &s3.PutBucketLifecycleConfigurationInput{
		Bucket: aws.String(bucket),
		LifecycleConfiguration: &types.BucketLifecycleConfiguration{
			Rules: rules,
		},
	})

	if err != nil {
		utils.ResponseError(w, fmt.Errorf("cannot set lifecycle: %w", err))
		return
	}

	utils.ResponseSuccess(w, map[string]bool{"ok": true})
}

func (l *Lifecycle) DeleteLifecycle(w http.ResponseWriter, r *http.Request) {
	bucket := r.PathValue("bucket")

	client, err := getS3Client(bucket)
	if err != nil {
		utils.ResponseError(w, fmt.Errorf("cannot get S3 client: %w", err))
		return
	}

	_, err = client.DeleteBucketLifecycle(context.Background(), &s3.DeleteBucketLifecycleInput{
		Bucket: aws.String(bucket),
	})

	if err != nil {
		var apiErr smithy.APIError
		if ok := isAPIError(err, &apiErr); ok && apiErr.ErrorCode() == "NoSuchLifecycleConfiguration" {
			utils.ResponseSuccess(w, map[string]bool{"ok": true})
			return
		}
		utils.ResponseError(w, fmt.Errorf("cannot delete lifecycle: %w", err))
		return
	}

	utils.ResponseSuccess(w, map[string]bool{"ok": true})
}

func isAPIError(err error, target *smithy.APIError) bool {
	for err != nil {
		if ae, ok := err.(smithy.APIError); ok {
			*target = ae
			return true
		}
		if uw, ok := err.(interface{ Unwrap() error }); ok {
			err = uw.Unwrap()
		} else {
			break
		}
	}
	return false
}
