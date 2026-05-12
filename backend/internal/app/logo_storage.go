package app

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type tenantLogoStorage interface {
	PutTenantLogo(ctx context.Context, objectKey string, contentType string, body io.Reader) error
}

type R2LogoConfig struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
	PublicBaseURL   string
	Prefix          string
}

type r2TenantLogoStorage struct {
	bucket string
	client *s3.Client
}

func NewR2TenantLogoStorage(ctx context.Context, cfg R2LogoConfig) (tenantLogoStorage, error) {
	if strings.TrimSpace(cfg.Endpoint) == "" || strings.TrimSpace(cfg.AccessKeyID) == "" || strings.TrimSpace(cfg.SecretAccessKey) == "" || strings.TrimSpace(cfg.Bucket) == "" {
		return nil, nil
	}
	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("auto"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("load r2 config: %w", err)
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(strings.TrimRight(cfg.Endpoint, "/"))
		o.UsePathStyle = true
	})
	return &r2TenantLogoStorage{bucket: cfg.Bucket, client: client}, nil
}

func (s *r2TenantLogoStorage) PutTenantLogo(ctx context.Context, objectKey string, contentType string, body io.Reader) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(objectKey),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	return err
}

type localTenantLogoStorage struct {
	root string
}

func NewLocalTenantLogoStorage(root string) tenantLogoStorage {
	root = strings.TrimSpace(root)
	if root == "" {
		return nil
	}
	return &localTenantLogoStorage{root: root}
}

func (s *localTenantLogoStorage) PutTenantLogo(ctx context.Context, objectKey string, contentType string, body io.Reader) error {
	_ = ctx
	_ = contentType
	cleanKey := filepath.Clean("/" + strings.TrimLeft(objectKey, "/"))
	if strings.Contains(cleanKey, "..") {
		return fmt.Errorf("invalid object key")
	}
	path := filepath.Join(s.root, strings.TrimLeft(cleanKey, "/"))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()
	_, err = io.Copy(file, body)
	return err
}

func buildTenantLogoObjectKey(prefix, tenantID, extension string) string {
	prefix = strings.Trim(strings.TrimSpace(prefix), "/")
	if prefix == "" {
		prefix = "logo"
	}
	extension = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(extension)), ".")
	return prefix + "/" + tenantID + "/school-logo." + extension
}

func buildPublicAssetURL(publicBaseURL, objectKey string) string {
	base := strings.TrimRight(strings.TrimSpace(publicBaseURL), "/")
	if base == "" || strings.TrimSpace(objectKey) == "" {
		return ""
	}
	return base + "/" + strings.TrimLeft(objectKey, "/")
}
