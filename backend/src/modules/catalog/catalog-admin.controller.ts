import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogService } from './catalog.service';
import { ProductsService } from './products.service';
import { ProductImportService } from './product-import.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { CreateOriginDto, UpdateOriginDto } from './dto/origin.dto';
import { CreateCertificationDto, UpdateCertificationDto } from './dto/certification.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { UploadProductDocumentDto } from './dto/upload-product-document.dto';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import {
  csvImportUploadOptions,
  documentUploadOptions,
  imageUploadOptions,
} from '../../common/utils/file-upload.util';

@ApiTags('admin/catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/catalog')
export class CatalogAdminController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly productsService: ProductsService,
    private readonly productImportService: ProductImportService,
  ) {}

  // ---------- Categories ----------

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Get('categories')
  listCategories() {
    return this.catalogService.listCategoriesFlat();
  }

  @Get('categories/:id')
  getCategory(@Param('id') id: string) {
    return this.catalogService.getCategoryById(id);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(id);
  }

  // ---------- Brands ----------

  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.catalogService.createBrand(dto);
  }

  @Get('brands')
  listBrands() {
    return this.catalogService.listBrands();
  }

  @Get('brands/:id')
  getBrand(@Param('id') id: string) {
    return this.catalogService.getBrandById(id);
  }

  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.catalogService.updateBrand(id, dto);
  }

  @Delete('brands/:id')
  deleteBrand(@Param('id') id: string) {
    return this.catalogService.deleteBrand(id);
  }

  // ---------- Origins ----------

  @Post('origins')
  createOrigin(@Body() dto: CreateOriginDto) {
    return this.catalogService.createOrigin(dto);
  }

  @Get('origins')
  listOrigins() {
    return this.catalogService.listOrigins();
  }

  @Get('origins/:id')
  getOrigin(@Param('id') id: string) {
    return this.catalogService.getOriginById(id);
  }

  @Patch('origins/:id')
  updateOrigin(@Param('id') id: string, @Body() dto: UpdateOriginDto) {
    return this.catalogService.updateOrigin(id, dto);
  }

  @Delete('origins/:id')
  deleteOrigin(@Param('id') id: string) {
    return this.catalogService.deleteOrigin(id);
  }

  // ---------- Certifications ----------

  @Post('certifications')
  createCertification(@Body() dto: CreateCertificationDto) {
    return this.catalogService.createCertification(dto);
  }

  @Get('certifications')
  listCertifications() {
    return this.catalogService.listCertifications();
  }

  @Get('certifications/:id')
  getCertification(@Param('id') id: string) {
    return this.catalogService.getCertificationById(id);
  }

  @Patch('certifications/:id')
  updateCertification(@Param('id') id: string, @Body() dto: UpdateCertificationDto) {
    return this.catalogService.updateCertification(id, dto);
  }

  @Delete('certifications/:id')
  deleteCertification(@Param('id') id: string) {
    return this.catalogService.deleteCertification(id);
  }

  // ---------- Products ----------

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get('products')
  listProducts(@Query() query: AdminProductQueryDto) {
    return this.productsService.adminList(query);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.productsService.adminFindOne(id);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // ---------- Product bulk import (CSV/Excel) ----------

  @Get('products/import/template')
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = this.productImportService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="product-import-template.xlsx"',
    });
    res.send(buffer);
  }

  @Post('products/import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { ...csvImportUploadOptions, storage: memoryStorage() }))
  importProducts(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.productImportService.import(file.buffer);
  }

  // ---------- Product images ----------

  @Post('products/:id/images')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadProductImageDto,
  ) {
    return this.productsService.addImage(id, file, dto);
  }

  @Delete('products/:id/images/:imageId')
  deleteProductImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImage(id, imageId);
  }

  // ---------- Product documents ----------

  @Post('products/:id/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  uploadProductDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadProductDocumentDto,
  ) {
    return this.productsService.addDocument(id, file, dto);
  }

  @Delete('products/:id/documents/:docId')
  deleteProductDocument(@Param('id') id: string, @Param('docId') docId: string) {
    return this.productsService.removeDocument(id, docId);
  }

  // ---------- Product certifications (attach/detach) ----------

  @Post('products/:id/certifications/:certificationId')
  attachCertification(@Param('id') id: string, @Param('certificationId') certificationId: string) {
    return this.productsService.attachCertification(id, certificationId);
  }

  @Delete('products/:id/certifications/:certificationId')
  detachCertification(@Param('id') id: string, @Param('certificationId') certificationId: string) {
    return this.productsService.detachCertification(id, certificationId);
  }

  // ---------- Batch / lot traceability ----------

  @Post('products/:id/batches')
  createBatch(@Param('id') id: string, @Body() dto: CreateProductBatchDto) {
    return this.productsService.createBatch(id, dto);
  }

  @Get('products/:id/batches')
  listBatches(@Param('id') id: string) {
    return this.productsService.listBatches(id);
  }
}
