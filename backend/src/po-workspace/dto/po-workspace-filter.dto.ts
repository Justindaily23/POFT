// export class PoWorkspaceFilterDto {
//   duid?: string;
//   poNumber?: string;
//   projectCode?: string;
//   projectName?: string;
//   pm?: string;
//   poTypes?: string[];

//   page?: number; // pagination cursor
//   limit?: number;
// }

import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';

export class PoWorkspaceFilterDto {
  @IsOptional()
  @IsString()
  duid?: string;

  @IsOptional()
  @IsString()
  poNumber?: string;

  @IsOptional()
  @IsString()
  projectCode?: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  pm?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  poTypes?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
