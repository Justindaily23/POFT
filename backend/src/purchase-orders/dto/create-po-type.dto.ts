import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreatePoTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}