import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  //   @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsJWT()
  refreshToken!: string;
}
