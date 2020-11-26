import { Construct } from 'constructs';
// CDKTF
import { TerraformStack, TerraformOutput } from 'cdktf';

import { S3Bucket } from './.gen/providers/aws/s3-bucket';

import { S3BucketObject } from './.gen/providers/aws/s3-bucket-object'

import { sufix, defaultTags } from './global'

export class BucketS3 extends TerraformStack {
    constructor(scope: Construct, name: string){
        super(scope, name);        

        const s3Bucket = new S3Bucket(this, 'Bucket', {
            bucket: `bucket-${sufix}`,
            tags: defaultTags
        })

        const obj = new S3BucketObject(this, 'BucketObject', {
            bucket: s3Bucket.acl,
            source: './lambda_function_payload.zip',
            key: 'lambda_function_payload',
            tags: defaultTags
        })


        new TerraformOutput(this, 'bucket', {
            value: obj.bucket
        })

        new TerraformOutput(this, 'object', {
            value: obj.contentBase64
        })
        
    }
}
