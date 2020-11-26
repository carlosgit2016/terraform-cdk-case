import { Construct } from 'constructs';
// CDKTF
import { App, TerraformStack } from 'cdktf';

// AWS Provider
import { AwsProvider } from './.gen/providers/aws';

// Resources
import { IamRole } from './.gen/providers/aws/iam-role';
import { IamPolicy } from './.gen/providers/aws/iam-policy';
import { IamPolicyAttachment } from './.gen/providers/aws/iam-policy-attachment'
import { LambdaFunction } from './.gen/providers/aws/lambda-function';
import { DynamodbTable } from './.gen/providers/aws/dynamodb-table';
import { S3Bucket } from './.gen/providers/aws/s3-bucket';
import { S3BucketObject } from './.gen/providers/aws/s3-bucket-object';
import { TerraformOutput } from 'cdktf'

import { sufix, defaultTags } from './global';

// Data Source
import { DataAwsIamPolicyDocument } from './.gen/providers/aws/data-aws-iam-policy-document';

class MyStack extends TerraformStack {

  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', {
      region: 'us-east-1'
    })

    const s3Bucket = new S3Bucket(this, 'trimble_bucket', {
      bucket: 'trimble-bucket-test-cdk',
      acl: 'private',
      tags: defaultTags
    })

    const obj = new S3BucketObject(this, 'BucketObject', {
        bucket: s3Bucket.bucket,
        source: '../lambda_function_payload.zip',
        key: 'lambda_function_payload',
        tags: defaultTags,
        dependsOn: [
          s3Bucket
        ]
    })
    
    const dynamoDbTable = new DynamodbTable(this, 'Dynamo', {
      attribute: [
        {
          name: 'attr1',
          type: 'S'
        }
      ],
      hashKey: 'attr1',
      name: `table_${sufix}`,
      tags: defaultTags,
      writeCapacity: 10,
      readCapacity: 10

    })

    const documentAssumeRolePolicy = new DataAwsIamPolicyDocument(this, 'Document', {
      statement: [
        {
          actions: ["sts:AssumeRole"],
          principals: [
            {
              type: "Service",
              identifiers: ["lambda.amazonaws.com"]
            }
          ],
          effect: "Allow"
        }
      ]
    })

    const documentPolicy = new DataAwsIamPolicyDocument(this, 'DocumentPolicy', {
      statement: [
        {
          actions: [
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:GetItem",
            "dynamodb:PutItem"
          ],
          effect: "Allow",
          resources: [
            dynamoDbTable.arn
          ]
        }
      ]
    })


    const policy = new IamPolicy(this, 'IamPolicy', {
      policy: documentPolicy.json,
      name: `iam_policy_${sufix}`
    })

    const role = new IamRole(this, 'IamRole', {
      name: `iam_role_${sufix}`,
      assumeRolePolicy: documentAssumeRolePolicy.json,
      description: 'Our awesome role',
      tags: defaultTags,
    })

    const rolePolicyAttachment = new IamPolicyAttachment(this, 'IamRolePolicy', {
      name: `iam_role_policy_attachment_${sufix}`,
      policyArn: policy.arn,
      roles: [
        role.name
      ]
    })

    const lambda = new LambdaFunction(this, 'LambdaFunction', {
      functionName: `lambda_function_${sufix}`,
      handler: 'lambda/index.js',
      role: role.arn,
      runtime: 'nodejs12.x',
      s3Bucket: s3Bucket.bucket,
      s3Key: obj.key,
      dependsOn: [
        role,
        policy,
        rolePolicyAttachment
      ]
    })

    new TerraformOutput(this, 'lambda_name', {
      value: lambda.functionName
    })

    new TerraformOutput(this, 'dynamodb_table', {
      value: dynamoDbTable.name
    })
    
  }
}

const app = new App();
new MyStack(app, 'terraform-cdk-case');
app.synth();
