import { AsyncPipe, CommonModule, NgFor, NgIf, NgOptimizedImage } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { storage } from '../../apis/config';
import { SlugService } from '../../home/home.component';

@Component({
  selector: 'app-article',
  standalone : true,
  imports : [CommonModule , NgOptimizedImage , NgFor, NgIf, AsyncPipe, RouterLink],
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.css']
})
export class ArticleComponent implements OnInit {
  @Input() article: any;
  storage = storage;

  // Injecting the SlugService into the component
  constructor() {}

  ngOnInit(): void {
    // Generate the slug when the article is initialized
    if (this.article && this.article.slug) {
      this.article.slug = this.createSlug(this.article.slug);
    }
  }
    createSlug(input: string): string {
    return input
      .replace(/\s+/g, '-') // Replace spaces with hyphens  
  }
}